import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Undo, Redo } from 'lucide-react';

function MenuBar({ editor }) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const buttons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Underline' },
    { icon: LinkIcon, action: addLink, active: editor.isActive('link'), title: 'Link' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, title: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, title: 'Redo' },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1.5 bg-slate-50 rounded-t-lg">
      {buttons.map((btn, i) => (
        <button
          key={i}
          type="button"
          onClick={btn.action}
          title={btn.title}
          className={`p-1.5 rounded transition-colors ${
            btn.active ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
          }`}
        >
          <btn.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

export default function SignatureEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 min-h-[120px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[100px]"
      />
    </div>
  );
}
