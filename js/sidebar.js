/**
 * Khanna Travels & Holidays — Adjustable & Collapsible Sidebar Controller
 * (js/sidebar.js)
 * Supports:
 * - Dragging width between 64px and 420px via .sidebar__resizer
 * - Snapping to collapsed icon-only rail (64px) when dragged below 135px
 * - 1-click collapse / expand toggle button with rotating chevron
 * - Persistent width and collapsed state in localStorage
 * - Automatic tooltips for collapsed icon rail
 */

[(initSidebar)] = [];
(function() {
  const STORAGE_WIDTH_KEY = 'khanna_sidebar_w';
  const STORAGE_COLLAPSED_KEY = 'khanna_sidebar_collapsed';
  const DEFAULT_WIDTH = 240;
  const MIN_WIDTH = 64;
  const SNAP_COLLAPSE_THRESHOLD = 135;
  const MAX_WIDTH = 420;

  let isDragging = false;
  let startX = 0;
  let startWidth = DEFAULT_WIDTH;

  function initSidebar() {
    const sidebar = document.querySelector('[data-sidebar]');
    if (!sidebar) return;

    // Add resizer handle if not present
    let resizer = sidebar.querySelector('.sidebar__resizer');
    if (!resizer) {
      resizer = document.createElement('div');
      resizer.className = 'sidebar__resizer';
      resizer.title = 'Drag to resize sidebar (double-click to reset)';
      sidebar.appendChild(resizer);
    }

    // Restore saved state
    const savedCollapsed = localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
    const savedWidth = parseInt(localStorage.getItem(STORAGE_WIDTH_KEY), 10);

    if (savedCollapsed) {
      setCollapsed(true, false);
    } else if (!isNaN(savedWidth) && savedWidth >= SNAP_COLLAPSE_THRESHOLD) {
      setWidth(savedWidth, false);
    } else {
      setWidth(DEFAULT_WIDTH, false);
    }

    // Attach resize listeners
    resizer.addEventListener('mousedown', onMouseDown);
    resizer.addEventListener('touchstart', onTouchStart, { passive: false });

    // Collapse toggle button listener
    const toggleBtn = document.querySelector('[data-sidebar-toggle]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const currentlyCollapsed = sidebar.classList.contains('is-collapsed');
        setCollapsed(!currentlyCollapsed, true);
      });
    }

    // Double-click resizer to reset to default
    resizer.addEventListener('dblclick', function() {
      setCollapsed(false, true);
      setWidth(DEFAULT_WIDTH, true);
    });
  }

  function setWidth(w, save) {
    const sidebar = document.querySelector('[data-sidebar]');
    if (!sidebar) return;

    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(w)));
    sidebar.style.setProperty('--sidebar-w', clamped + 'px');
    sidebar.style.width = clamped + 'px';

    if (clamped <= SNAP_COLLAPSE_THRESHOLD) {
      sidebar.classList.add('is-collapsed');
      updateCollapseBtn(true);
    } else {
      sidebar.classList.remove('is-collapsed');
      updateCollapseBtn(false);
    }

    if (save) {
      localStorage.setItem(STORAGE_WIDTH_KEY, clamped);
      localStorage.setItem(STORAGE_COLLAPSED_KEY, sidebar.classList.contains('is-collapsed') ? 'true' : 'false');
    }
  }

  function setCollapsed(collapse, save) {
    const sidebar = document.querySelector('[data-sidebar]');
    if (!sidebar) return;

    if (collapse) {
      sidebar.classList.add('is-collapsed');
      sidebar.style.setProperty('--sidebar-w', '64px');
      sidebar.style.width = '64px';
      updateCollapseBtn(true);
    } else {
      sidebar.classList.remove('is-collapsed');
      const savedWidth = parseInt(localStorage.getItem(STORAGE_WIDTH_KEY), 10);
      const restoreWidth = (!isNaN(savedWidth) && savedWidth >= SNAP_COLLAPSE_THRESHOLD) ? savedWidth : DEFAULT_WIDTH;
      sidebar.style.setProperty('--sidebar-w', restoreWidth + 'px');
      sidebar.style.width = restoreWidth + 'px';
      updateCollapseBtn(false);
    }

    if (save) {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, collapse ? 'true' : 'false');
    }
  }

  function updateCollapseBtn(isCollapsed) {
    const btn = document.querySelector('[data-sidebar-toggle]');
    if (!btn) return;
    btn.setAttribute('aria-expanded', !isCollapsed);
    btn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse to Icons';
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientX);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    startDrag(e.touches[0].clientX);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  function startDrag(clientX) {
    const sidebar = document.querySelector('[data-sidebar]');
    if (!sidebar) return;
    isDragging = true;
    startX = clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    sidebar.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    handleDrag(e.clientX);
  }

  function onFouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    handleDrag(e.touches[0].clientX);
  }

  function handleDrag(currentX) {
    const delta = currentX - startX;
    const newWidth = startWidth + delta;

    if (newWidth < SNAP_COLLAPSE_THRESHOLD) {
      setWidth(MIN_WIDTH, false);
    } else {
      setWidth(newWidth, false);
    }
  }

  function onMouseUp() {
    if (!isDragging) return;
    endDrag();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function onTouchEnd() {
    if (!isDragging) return;
    endDrag();
    document.removeEventListener('touchMove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  function endDrag() {
    const sidebar = document.querySelector('[data-sidebar]');
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (sidebar) {
      sidebar.classList.remove('is-resizing');
      const finalW = sidebar.getBoundingClientRect().width;
      if (finalW < SNAP_COLLAPSE_THRESHOLD) {
        setCollapsed(true, true);
      } else {
        setWidth(finalW, true);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }

  window.KhannaSidebar = {
    setCollapsed: setCollapsed,
    setWidth: setWidth
  };
})();
