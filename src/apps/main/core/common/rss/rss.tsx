import RSSStyle from "./rss-style.css?inline";

export function RSSAction() {
    return (
    <>
    <xul:hbox id="rssPageAction" data-l10n-id="rss-page-action"
     class="urlbar-page-action" tooltiptext="rss-page-action"
     role="button" popup="rss-panel">
     <xul:image id="rssPageAction-image" class="urlbar-icon"/>
     <xul:panel id="rss-panel" type="arrow" position="bottomright topright" onpopupshowing="window.gFloorp.rssReader.onPopup();">
     <xul:vbox id="rss-box">
       <xul:hbox id="rss-content-hbox">
        <xul:vbox id="rss-content-label-vbox">
        <h2>
          <xul:label id="rss-content-label"/>
         </h2>
         <description id="rss-content-description">通知やホームで最新情報を受け取ることができます。</description>
        </xul:vbox>
       </xul:hbox>
       <xul:hbox id="rss-button-hbox">
        <xul:button id="rss-app-install-button" class="panel-button rss-install-buttons" oncommand="window.gFloorp.rssReader.addRSSFeed();">受け取る</xul:button>
        <xul:button id="rss-app-cancel-button" class="panel-button rss-install-buttons" data-l10n-id="rss-app-cancel-button" oncommand="window.gFloorp.rssReader.closePopup();">キャンセル</xul:button>
        </xul:hbox>
      </xul:vbox>
     </xul:panel>
    </xul:hbox>
    <style>
      {RSSStyle}
    </style>
    </>
      );
}