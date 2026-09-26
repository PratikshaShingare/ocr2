/**
 * Khanna Travels & Holidays — Canonical Preview Controller
 * (js/preview.js)
 * Enhanced with:
 * - Multi-page document support (Front Page, Last Page, etc.)
 * - Instant page flipping (Front ⇄ Last)
 * - Page counter indicator ("Page X of Y")
 * - Dynamic page classification badge (Bio-data / Family & Address)
 * - Rotation, zoom, pan, and full-resolution modal inspection
 */

const PreviewController = {
  pages: [],
  currentPageIndex: 0,
  currentRotation: 0,
  currentScale: 1.0,

  /**
   * Sets and renders multiple document pages.
   * Prioritizes Front Page (Bio-data) as initial preview.
   */
  setPages(pagesList, defaultIndex = null) {
    this.pages = Array.isArray(pagesList) && pagesList.length > 0 ? pagesList : [];

    if (this.pages.length === 0) {
      this.clearPreview();
      return;
    }

    // Ensure all pages have initialized rotation state
    this.pages.forEach(p => {
      if (typeof p.rotation !== 'number') {
        p.rotation = 0;
      }
    });

    // Determine default starting page index
    if (defaultIndex !== null && defaultIndex >= 0 && defaultIndex < this.pages.length) {
      this.currentPageIndex = defaultIndex;
    } else {
      // Prioritize BIO_DATA
      const frontIdx = this.pages.findIndex(p => p.pageType === 'BIO_DATA' || p.pageType === 'FRONT_PAGE');
      if (frontIdx !== -1) {
        this.currentPageIndex = frontIdx;
      } else {
        // Find first page that has data
        const dataIdx = this.pages.findIndex(p => p.hasData);
        this.currentPageIndex = dataIdx !== -1 ? dataIdx : 0;
      }
    }

    this.renderCurrentPage();
  },

  /**
   * Legacy / single image support: wraps single image into pages array.
   */
  setImage(dataUrl) {
    if (!dataUrl) {
      this.clearPreview();
      return;
    }
    this.setPages([
      {
        pageNumber: 1,
        pageType: 'FRONT_PAGE',
        label: 'Front Page',
        hasData: true,
        previewImage: dataUrl,
        rotation: 0
      }
    ]);
  },

  /**
   * Renders the current active page into preview canvas and updates toolbar controls.
   */
  renderCurrentPage() {
    const previewImg = document.getElementById('canonicalPreviewImg');
    const placeholder = document.getElementById('previewPlaceholder');
    const toolbar = document.getElementById('previewToolbar');
    const indicator = document.getElementById('previewPageIndicator');
    const pageBadge = document.getElementById('previewPageBadge');
    const btnFlip = document.getElementById('btnFlipPage');

    if (!previewImg || !placeholder) return;

    if (this.pages.length === 0) {
      this.clearPreview();
      return;
    }

    const curPage = this.pages[this.currentPageIndex];
    if (!curPage || !curPage.previewImage) {
      return;
    }

    // Display image
    previewImg.src = curPage.previewImage;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
    if (toolbar) toolbar.style.display = 'flex';

    // Update Page Indicator ("Page 1 of 2")
    if (indicator) {
      indicator.textContent = `Page ${this.currentPageIndex + 1} of ${this.pages.length}`;
    }

    // Page badge: hidden as requested (item 9)
    if (pageBadge) {
      pageBadge.style.display = 'none';
    }

    // Update Flip button
    if (btnFlip) {
      btnFlip.style.display = (this.pages.length > 1) ? 'inline-flex' : 'none';
      btnFlip.title = this.pages.length === 2 ?
        (this.currentPageIndex === 0 ? 'Flip to Last Page' : 'Flip to Front Page') :
        'Cycle to Next Page';
    }

    // Restore this specific page's persistent rotation
    this.currentRotation = curPage.rotation || 0;
    this.applyTransform();
  },

  /**
   * Clears preview container and shows placeholder.
   */
  clearPreview() {
    const previewImg = document.getElementById('canonicalPreviewImg');
    const placeholder = document.getElementById('previewPlaceholder');
    const toolbar = document.getElementById('previewToolbar');

    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
    if (toolbar) {
      toolbar.style.display = 'none';
    }
    this.pages = [];
    this.currentPageIndex = 0;
  },

  /**
   * Flips page: if 2 pages (Front/Last), toggles between them.
   * If >2 pages, cycles sequentially.
   * Includes smooth 3D flip animation and preserves per-page rotation.
   */
  flipPage() {
    if (this.pages.length <= 1) return;

    const previewImg = document.getElementById('canonicalPreviewImg');
    if (previewImg) {
      previewImg.classList.add('flipping');
    }

    setTimeout(() => {
      if (this.pages.length === 2) {
        this.currentPageIndex = this.currentPageIndex === 0 ? 1 : 0;
      } else {
        this.currentPageIndex = (this.currentPageIndex + 1) % this.pages.length;
      }

      this.renderCurrentPage();

      setTimeout(() => {
        if (previewImg) {
          previewImg.classList.remove('flipping');
        }
      }, 120);
    }, 120);
  },

  /**
   * Navigates to next page.
   */
  nextPage() {
    if (this.currentPageIndex < this.pages.length - 1) {
      this.currentPageIndex++;
      this.renderCurrentPage();
    }
  },

  /**
   * Navigates to previous page.
   */
  prevPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
      this.renderCurrentPage();
    }
  },

  /**
   * Rotates preview image by given degrees and persists rotation for active page.
   */
  rotate(degrees) {
    if (this.pages[this.currentPageIndex]) {
      const cur = this.pages[this.currentPageIndex].rotation || 0;
      const newRot = (cur + degrees) % 360;
      this.pages[this.currentPageIndex].rotation = newRot;
      this.currentRotation = newRot;
      this.applyTransform();
    }
  },

  /**
   * Zooms preview image by given delta (e.g. +0.15 or -0.15).
   */
  zoom(delta) {
    this.currentScale = Math.max(0.4, Math.min(3.0, this.currentScale + delta));
    this.applyTransform();
  },

  /**
   * Resets rotation and scale.
   */
  resetTransform() {
    if (this.pages[this.currentPageIndex]) {
      this.pages[this.currentPageIndex].rotation = 0;
    }
    this.currentRotation = 0;
    this.currentScale = 1.0;
    this.applyTransform();
  },

  /**
   * Applies CSS transform with rotation and scale.
   */
  applyTransform() {
    const previewImg = document.getElementById('canonicalPreviewImg');
    if (previewImg) {
      previewImg.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
    }
  },

  /**
   * Opens the preview in a high-resolution inspection modal.
   */
  openModal() {
    const previewImg = document.getElementById('canonicalPreviewImg');
    if (!previewImg || !previewImg.src) {
      showToast('No passport image loaded to inspect.', 'info');
      return;
    }

    const modal = document.getElementById('previewModal');
    const modalImg = document.getElementById('modalPreviewImg');
    if (modal && modalImg) {
      modalImg.src = previewImg.src;
      modal.classList.add('active');
    }
  },

  /**
   * Closes the inspection modal.
   */
  closeModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }
};
