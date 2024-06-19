import "./App.css";

function App() {
  return (
    <div id="memo-contents">
      <div id="header-box">
        <div id="title-box">
          <h2 id="header">Floorp Notes</h2>
          <div id="beta">BETA</div>
          <div id="offline-label" data-l10n-id="readonly-mode" hidden={true} />
        </div>
        <input type="button" id="memo-add" data-l10n-id="new-memo" />
      </div>
      <div id="memo-lists-sidebar">
        <div id="memo-list" />
      </div>
      <div id="memo-form">
        <div id="titleAndDelete">
          <input type="text" id="memo-title-input" />
          <input type="button" id="memo-delete" data-l10n-id="delete-memo" />
        </div>
        <div id="memo-input-box">
          <textarea id="memo-input" />
          <div id="html-output" style={{ display: "none" }} />
        </div>
        <div id="button-box">
          <input type="button" id="memo-save" data-l10n-id="save-memo" />
          <input
            type="button"
            id="memo-markdown-preview"
            data-l10n-id="chage-view-mode"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
