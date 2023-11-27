import {
  EditorTiptapContext,
  EditorTiptapViewHTML,
} from "~/components/libs/editor-tiptap"

export default function ExampleEditor() {
  return (
    <div className="site-container">
      <section className="site-section">
        <EditorTiptapContext>
          <EditorTiptapViewHTML />
        </EditorTiptapContext>
      </section>
    </div>
  )
}
