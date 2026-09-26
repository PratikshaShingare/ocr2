/**
 * Khanna Travels & Holidays — Word-like In-Browser Editing Toolbar
 * (js/word-toolbar.js)
 * Provides formatting, alignment, bulleting, and dynamic table row/col manipulation
 * across Cover Letter, Hotel Blocking, and Authorization documents.
 */

const WordToolbar = {
  render(targetId) {
    return `
      <div class="word-toolbar" data-target="${targetId}">
        <div class="word-toolbar__group">
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'bold')" title="Bold (Ctrl+B)"><b>B</b></button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'italic')" title="Italic (Ctrl+I)"><i>I</i></button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'underline')" title="Underline (Ctrl+U)"><u>U</u></button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'strikeThrough')" title="Strikethrough"><s>S</s></button>
        </div>

        <div class="word-toolbar__divider"></div>

        <div class="word-toolbar__group">
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'justifyLeft')" title="Align Left">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'justifyCenter')" title="Align Center">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="18" y1="14" x2="6" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'justifyRight')" title="Align Right">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
          </button>
        </div>

        <div class="word-toolbar__divider"></div>

        <div class="word-toolbar__group">
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'insertUnorderedList')" title="Bullet List">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'insertOrderedList')" title="Numbered List">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
          </button>
        </div>

        <div class="word-toolbar__divider"></div>

        <!-- Table Operations -->
        <div class="word-toolbar__group">
          <button type="button" class="word-btn" onclick="WordToolbar.tableAction('${targetId}', 'addRow')" title="Add Table Row Below Active Row">
            <span style="font-size: 0.74rem; font-weight: 700;">+ Row</span>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.tableAction('${targetId}', 'delRow')" title="Delete Active Table Row">
            <span style="font-size: 0.74rem; font-weight: 700; color: var(--color-danger);">- Row</span>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.tableAction('${targetId}', 'addCol')" title="Add Table Column Right">
            <span style="font-size: 0.74rem; font-weight: 700;">+ Col</span>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.tableAction('${targetId}', 'delCol')" title="Delete Active Table Column">
            <span style="font-size: 0.74rem; font-weight: 700; color: var(--color-danger);">- Col</span>
          </button>
          <button type="button" class="word-btn" onclick="WordToolbar.tableAction('${targetId}', 'insertTable')" title="Insert 3-Column Table">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
          </button>
        </div>

        <div class="word-toolbar__divider"></div>

        <div class="word-toolbar__group">
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'undo')" title="Undo (Ctrl+Z)">↶</button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'redo')" title="Redo (Ctrl+Y)">↷</button>
          <button type="button" class="word-btn" onclick="WordToolbar.exec('${targetId}', 'removeFormat')" title="Clear Formatting">✕</button>
        </div>
      </div>
    `;
  },

  exec(targetId, command, value = null) {
    const editor = document.getElementById(targetId);
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
  },

  tableAction(targetId, action) {
    const editor = document.getElementById(targetId);
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    let cell = null;
    if (selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      cell = node.closest('td, th');
    }

    if (action === 'insertTable') {
      const tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1; font-size: 0.88rem;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Header 1</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Header 2</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Header 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Data 1</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Data 2</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Data 3</td>
            </tr>
          </tbody>
        </table>
        <p><br/></p>
      `;
      document.execCommand('insertHTML', false, tableHtml);
      return;
    }

    if (!cell) {
      // Find first table in editor
      const tbl = editor.querySelector('table');
      if (!tbl) {
        if (typeof showToast === 'function') {
          showToast('Please click inside a table cell to modify table rows or columns.', 'warning');
        }
        return;
      }
      cell = tbl.querySelector('td, th');
    }

    const row = cell.closest('tr');
    const table = row.closest('table');
    const colIndex = Array.from(row.children).indexOf(cell);

    if (action === 'addRow') {
      const newRow = row.cloneNode(true);
      Array.from(newRow.children).forEach(c => {
        c.innerHTML = '&nbsp;';
      });
      row.parentNode.insertBefore(newRow, row.nextSibling);
      if (typeof showToast === 'function') showToast('Added table row', 'info');
    } else if (action === 'delRow') {
      if (table.rows.length <= 1) {
        if (typeof showToast === 'function') showToast('Cannot delete the only row of the table.', 'warning');
        return;
      }
      row.remove();
      if (typeof showToast === 'function') showToast('Deleted table row', 'info');
    } else if (action === 'addCol') {
      Array.from(table.rows).forEach(r => {
        const isHeader = r.children[colIndex]?.tagName === 'TH';
        const newCell = document.createElement(isHeader ? 'th' : 'td');
        newCell.style.cssText = r.children[colIndex]?.style.cssText || 'padding: 6px 8px; border: 1px solid #cbd5e1;';
        newCell.innerHTML = '&nbsp;';
        r.insertBefore(newCell, r.children[colIndex]?.nextSibling || null);
      });
      if (typeof showToast === 'function') showToast('Added table column', 'info');
    } else if (action === 'delCol') {
      if (row.children.length <= 1) {
        if (typeof showToast === 'function') showToast('Cannot delete the only column of the table.', 'warning');
        return;
      }
      Array.from(table.rows).forEach(r => {
        if (r.children[colIndex]) {
          r.children[colIndex].remove();
        }
      });
      if (typeof showToast === 'function') showToast('Deleted table column', 'info');
    }
  }
};

window.WordToolbar = WordToolbar;
