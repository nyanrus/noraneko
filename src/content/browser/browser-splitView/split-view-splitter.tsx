export function SplitViewSplitter() {
  return (
    <xul:splitter
      id="splitview-splitter"
      class="deck-selected"
    >
    </xul:splitter>
  )
}

export function HideSplitViewSplitter() {
  return (
    <style
      id="splitterHideCSS"
    >{`
      #splitview-splitter {
        display: none !important;
      }
    `}
    </style>
  )
}