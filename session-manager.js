// ── SESSION MANAGEMENT FUNCTIONS ─────────────────────────────────────────────────────

// Store update data globally for the session
let sessionUpdateData = null;

window.showSaveSessionDialog = async function() {
  if (!S.allBars.length) {
    notif('No data to save. Please load data first.', 'warn');
    return;
  }
  
  // Update summary
  const open = S.orders.filter(o => o.status === 'open');
  const closed = S.orders.filter(o => o.status === 'closed');
  const totalPnL = closed.reduce((sum, o) => sum + o.pnl, 0);
  const currentBar = S.allBars[S.visIdx - 1];
  
  document.getElementById('summarySymbol').textContent = S.sym || '—';
  document.getElementById('summaryTimeframe').textContent = S.tf || '—';
  document.getElementById('summaryCurrentBar').textContent = S.visIdx + ' / ' + S.allBars.length;
  document.getElementById('summaryCurrentDate').textContent = currentBar ? formatDate(currentBar.t) : '—';
  document.getElementById('summaryBalance').textContent = '$' + S.bal.toFixed(2);
  document.getElementById('summaryOpenPositions').textContent = open.length;
  document.getElementById('summaryTotalTrades').textContent = S.orders.length;
  document.getElementById('summaryNetPnL').textContent = (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2);
  
  // Clear inputs
  document.getElementById('sessionNameInput').value = '';
  document.getElementById('sessionNotesInput').value = '';
  
  // Show dialog
  document.getElementById('saveSessionDialog').style.display = 'flex';
  document.getElementById('sessionNameInput').focus();
}

window.closeSaveSessionDialog = function() {
  document.getElementById('saveSessionDialog').style.display = 'none';
}

window.saveSession = async function() {
  const name = document.getElementById('sessionNameInput').value.trim();
  const notes = document.getElementById('sessionNotesInput').value.trim();
  
  if (!name) {
    notif('Please enter a session name', 'warn');
    return;
  }
  
  const session = {
    id: Date.now(),
    name: name,
    notes: notes,
    savedAt: new Date().toISOString(),
    data: {
      sym: S.sym,
      tf: S.tf,
      source: S.source,
      csvMeta: S.csvMeta,
      allBars: S.allBars,
      visIdx: S.visIdx,
      orders: S.orders,
      oid: S.oid,
      bal: S.bal,
      startBal: S.startBal,
      side: S.side,
      settings: {
        capital: document.getElementById('cCap').value,
        fee: document.getElementById('cFee').value,
        leverage: document.getElementById('oLev').value,
        stopLoss: document.getElementById('oSL').value,
        takeProfit: document.getElementById('oTP').value,
        amount: document.getElementById('oQty').value,
        startBar: document.getElementById('startBarInput').value
      }
    }
  };
  
  try {
    await sessionDB.addSession(session);
    closeSaveSessionDialog();
    notif(`Session "${name}" saved successfully!`, 'pos');
  } catch (error) {
    console.error('Failed to save session:', error);
    notif('Failed to save session', 'warn');
  }
}

window.showLoadSessionDialog = async function() {
  try {
    const sessions = await sessionDB.getAllSessions();
    const sessionsList = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<div class="empty-sessions">No saved sessions found</div>';
    } else {
      sessionsList.innerHTML = sessions.map(session => {
        const date = new Date(session.savedAt);
        const open = session.data.orders.filter(o => o.status === 'open').length;
        const total = session.data.orders.length;
        const pnl = session.data.orders
          .filter(o => o.status === 'closed')
          .reduce((sum, o) => sum + o.pnl, 0);
        
        return `
          <div class="session-item" onclick="loadSession(${session.id})">
            <div class="session-item-header">
              <span class="session-name">${session.name}</span>
              <span class="session-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
              <div class="session-actions">
                <button class="session-action-btn" onclick="event.stopPropagation(); editSession(${session.id})" title="Edit Session">✏️</button>
                <button class="session-action-btn delete" onclick="event.stopPropagation(); deleteSession(${session.id})" title="Delete Session">🗑️</button>
              </div>
            </div>
            ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
            <div class="session-stats">
              <span>${session.data.sym} ${session.data.tf}</span>
              <span>Open: ${open}</span>
              <span>Total: ${total}</span>
              <span>P&L: ${(pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2)}</span>
            </div>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('loadSessionDialog').style.display = 'flex';
  } catch (error) {
    console.error('Failed to load sessions:', error);
    notif('Failed to load sessions', 'warn');
  }
}

window.closeLoadSessionDialog = function() {
  document.getElementById('loadSessionDialog').style.display = 'none';
}

window.loadSession = async function(sessionId) {
  try {
    const session = await sessionDB.getSession(sessionId);
    
    if (!session) {
      notif('Session not found', 'warn');
      return;
    }
    
    // Restore session data
    const data = session.data;
    S.sym = data.sym;
    S.tf = data.tf;
    S.source = data.source;
    S.csvMeta = data.csvMeta;
    S.allBars = data.allBars;
    S.visIdx = data.visIdx;
    S.orders = data.orders;
    S.oid = data.oid;
    S.bal = data.bal;
    S.startBal = data.startBal;
    S.side = data.side;
    
    // Restore form settings
    document.getElementById('cCap').value = data.settings.capital;
    document.getElementById('cFee').value = data.settings.fee;
    document.getElementById('oLev').value = data.settings.leverage;
    document.getElementById('oSL').value = data.settings.stopLoss;
    document.getElementById('oTP').value = data.settings.takeProfit;
    document.getElementById('oQty').value = data.settings.amount;
    document.getElementById('startBarInput').value = data.settings.startBar;
    
    // Update UI
    if (S.source === 'csv' && S.csvMeta) {
      document.getElementById('csvPanel').classList.add('show');
      document.getElementById('csvLoadedInfo').style.display = 'flex';
      document.getElementById('dropZone').style.display = 'none';
      document.getElementById('metaSym').textContent = S.csvMeta.sym;
      document.getElementById('metaTf').textContent = S.csvMeta.tf;
      document.getElementById('metaBars').textContent = S.allBars.length;
      document.getElementById('metaFrom').textContent = formatDate(S.allBars[0].t);
      document.getElementById('metaTo').textContent = formatDate(S.allBars[S.allBars.length - 1].t);
      
      // Set date input min/max values
      const dateInput = document.getElementById('startDateInput');
      dateInput.min = formatDate(S.allBars[0].t);
      dateInput.max = formatDate(S.allBars[S.allBars.length - 1].t);
      
      // Topbar pills
      document.getElementById('csvInfo').style.display = 'flex';
      document.getElementById('csvSymPill').style.display = 'inline-block';
      document.getElementById('csvSymPill').textContent = S.csvMeta.sym;
      document.getElementById('csvTfPill').textContent = S.csvMeta.tf;
      document.getElementById('csvRowsPill').textContent = S.allBars.length + ' bars';
    }
    
    closeLoadSessionDialog();
    refreshAll();
    notif(`Session "${session.name}" loaded successfully!`, 'pos');
  } catch (error) {
    console.error('Failed to load session:', error);
    notif('Failed to load session', 'warn');
  }
}

window.deleteSession = async function(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }
  
  try {
    await sessionDB.deleteSession(sessionId);
    showLoadSessionDialog(); // Refresh the list
    notif('Session deleted', 'info');
  } catch (error) {
    console.error('Failed to delete session:', error);
    notif('Failed to delete session', 'warn');
  }
}

window.editSession = async function(sessionId) {
  try {
    const session = await sessionDB.getSession(sessionId);
    
    if (!session) {
      notif('Session not found', 'warn');
      return;
    }
    
    // Store current editing session ID
    S.editingSessionId = sessionId;
    
    // Populate edit form
    document.getElementById('editSessionNameInput').value = session.name;
    document.getElementById('editSessionNotesInput').value = session.notes || '';
    
    // Clear any previous update data
    sessionUpdateData = null;
    clearUpdateData();
    
    // Show edit dialog
    document.getElementById('editSessionDialog').style.display = 'flex';
    document.getElementById('editSessionNameInput').focus();
  } catch (error) {
    console.error('Failed to edit session:', error);
    notif('Failed to edit session', 'warn');
  }
}

window.closeEditSessionDialog = function() {
  document.getElementById('editSessionDialog').style.display = 'none';
  S.editingSessionId = null;
  sessionUpdateData = null;
}

window.updateSession = async function() {
  const name = document.getElementById('editSessionNameInput').value.trim();
  const notes = document.getElementById('editSessionNotesInput').value.trim();
  
  if (!name) {
    notif('Please enter a session name', 'warn');
    return;
  }
  
  try {
    const session = await sessionDB.getSession(S.editingSessionId);
    
    if (!session) {
      notif('Session not found', 'warn');
      return;
    }
    
    // Update session basic info
    session.name = name;
    session.notes = notes;
    session.updatedAt = new Date().toISOString();
    
    // Apply chart data updates if available
    if (sessionUpdateData) {
      const originalBars = session.data.allBars;
      const newBars = sessionUpdateData.bars;
      
      // Merge and sort bars by timestamp
      const mergedBars = [...originalBars, ...newBars].sort((a, b) => a.t - b.t);
      
      // Remove duplicates (same timestamp)
      const uniqueBars = mergedBars.filter((bar, index, arr) => 
        index === 0 || bar.t !== arr[index - 1].t
      );
      
      // Update session data
      session.data.allBars = uniqueBars;
      session.data.visIdx = Math.min(session.data.visIdx, uniqueBars.length);
      
      // Update CSV metadata
      if (session.data.csvMeta) {
        session.data.csvMeta.filename = session.data.csvMeta.filename + ' (updated)';
      }
      
      notif(`Chart data updated: +${newBars.length} bars (total: ${uniqueBars.length})`, 'pos');
    }
    
    // Save to IndexedDB
    await sessionDB.updateSession(session);
    
    closeEditSessionDialog();
    showLoadSessionDialog(); // Refresh the list
    notif(`Session "${name}" updated successfully!`, 'pos');
  } catch (error) {
    console.error('Failed to update session:', error);
    notif('Failed to update session', 'warn');
  }
}

// ── CHART DATA UPDATE FUNCTIONS ─────────────────────────────────────────────────
window.handleUpdateDataFile = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log('File selected:', file.name); // Debug log
  
  try {
    const text = await file.text();
    console.log('File text loaded, length:', text.length); // Debug log
    
    const bars = parseCSVText(text);
    console.log('Parsed bars:', bars.length); // Debug log
    
    if (!bars.length) {
      notif('No valid data found in CSV file', 'warn');
      return;
    }
    
    // Get current session data for validation
    const session = await sessionDB.getSession(S.editingSessionId);
    if (!session) {
      notif('Session not found', 'warn');
      return;
    }
    
    const originalBars = session.data.allBars;
    const originalLastTime = originalBars[originalBars.length - 1]?.t || 0;
    const newFirstTime = bars[0]?.t || 0;
    
    console.log('Original last time:', new Date(originalLastTime)); // Debug log
    console.log('New first time:', new Date(newFirstTime)); // Debug log
    console.log('Original first time:', new Date(originalBars[0]?.t || 0)); // Debug log
    console.log('New last time:', new Date(bars[bars.length - 1]?.t || 0)); // Debug log
    
    // Validate data compatibility - allow both forward and backward extension
    const originalFirstTime = originalBars[0]?.t || 0;
    const newLastTime = bars[bars.length - 1]?.t || 0;
    
    // Check if there's any overlap or if data can be extended
    const canExtendForward = newFirstTime > originalLastTime; // New data after existing
    const canExtendBackward = newLastTime < originalFirstTime; // New data before existing
    const hasOverlap = (newFirstTime >= originalFirstTime && newFirstTime <= originalLastTime) || 
                     (newLastTime >= originalFirstTime && newLastTime <= originalLastTime);
    
    if (!canExtendForward && !canExtendBackward && !hasOverlap) {
      notif('New data does not connect with existing data. Must be before, after, or overlapping with current range.', 'warn');
      return;
    }
    
    if (hasOverlap) {
      notif('New data overlaps with existing data. Duplicates will be removed during merge.', 'info');
    } else if (canExtendForward) {
      notif('Extending data forward with newer dates', 'info');
    } else if (canExtendBackward) {
      notif('Extending data backward with older dates', 'info');
    }
    
    // Store update data
    sessionUpdateData = {
      bars: bars,
      originalCount: originalBars.length,
      newCount: bars.length,
      originalFirstTime: originalFirstTime,
      originalLastTime: originalLastTime,
      newFirstTime: newFirstTime,
      newLastTime: newLastTime
    };
    
    // Calculate expected total after merge (before duplicate removal)
    let expectedTotal = originalBars.length + bars.length;
    
    // If there's overlap, estimate duplicates removal
    if (hasOverlap) {
      // Rough estimate of overlapping period
      const overlapStart = Math.max(originalFirstTime, newFirstTime);
      const overlapEnd = Math.min(originalLastTime, newLastTime);
      
      // Count potential overlapping bars (rough estimate)
      const originalOverlapBars = originalBars.filter(bar => bar.t >= overlapStart && bar.t <= overlapEnd).length;
      const newOverlapBars = bars.filter(bar => bar.t >= overlapStart && bar.t <= overlapEnd).length;
      
      // Estimate duplicates (same timestamps)
      const estimatedDuplicates = Math.min(originalOverlapBars, newOverlapBars);
      expectedTotal -= estimatedDuplicates;
    }
    
    // Update preview
    document.getElementById('newBarsCount').textContent = bars.length;
    document.getElementById('newDateRange').textContent = 
      `${formatDate(bars[0].t)} - ${formatDate(bars[bars.length - 1].t)}`;
    document.getElementById('totalBarsAfterUpdate').textContent = expectedTotal + ' (estimated)';
    
    // Show preview
    document.getElementById('updateDataPreview').style.display = 'block';
    
    notif(`Chart data ready for update: +${bars.length} new bars`, 'pos');
    
  } catch (error) {
    console.error('Failed to process update file:', error);
    notif('Failed to process CSV file: ' + error.message, 'warn');
  }
  
  // Reset file input
  event.target.value = '';
}

window.clearUpdateData = function() {
  sessionUpdateData = null;
  document.getElementById('updateDataPreview').style.display = 'none';
  document.getElementById('updateDataFileInput').value = '';
}

window.exportAllSessions = async function() {
  try {
    const sessions = await sessionDB.getAllSessions();
    
    if (sessions.length === 0) {
      notif('No sessions to export', 'warn');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sessions: sessions
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-sessions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    notif(`Exported ${sessions.length} sessions`, 'pos');
  } catch (error) {
    console.error('Failed to export sessions:', error);
    notif('Failed to export sessions', 'warn');
  }
}

window.importSessionsAppend = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      if (!importData.sessions || !Array.isArray(importData.sessions)) {
        throw new Error('Invalid session file format');
      }
      
      const existingSessions = await sessionDB.getAllSessions();
      const existingIds = new Set(existingSessions.map(s => s.id));
      
      // Filter out duplicates and only add new sessions
      const newSessions = importData.sessions.filter(session => !existingIds.has(session.id));
      const duplicateCount = importData.sessions.length - newSessions.length;
      
      if (newSessions.length === 0) {
        notif('All sessions already exist (no new sessions to import)', 'info');
        return;
      }
      
      // Add only new sessions to IndexedDB
      for (const session of newSessions) {
        await sessionDB.addSession(session);
      }
      
      let message = `Imported ${newSessions.length} new session${newSessions.length > 1 ? 's' : ''}`;
      if (duplicateCount > 0) {
        message += ` (skipped ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''})`;
      }
      
      notif(message, 'pos');
      showLoadSessionDialog(); // Refresh the list
      
    } catch (error) {
      console.error('Import failed:', error);
      notif('Failed to import sessions: ' + error.message, 'warn');
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input to allow importing the same file again
  event.target.value = '';
}

window.importSessions = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      if (!importData.sessions || !Array.isArray(importData.sessions)) {
        throw new Error('Invalid session file format');
      }
      
      const existingSessions = await sessionDB.getAllSessions();
      const mergedSessions = [...existingSessions, ...importData.sessions];
      
      // Remove duplicates by ID
      const uniqueSessions = mergedSessions.filter((session, index, arr) => 
        arr.findIndex(s => s.id === session.id) === index
      );
      
      // Clear existing and add all unique sessions
      await sessionDB.clearAllSessions();
      for (const session of uniqueSessions) {
        await sessionDB.addSession(session);
      }
      
      notif(`Imported ${importData.sessions.length} sessions`, 'pos');
      showLoadSessionDialog(); // Refresh the list
      
    } catch (error) {
      console.error('Import failed:', error);
      notif('Failed to import sessions: ' + error.message, 'warn');
    }
  };
  
  reader.readAsText(file);
}
