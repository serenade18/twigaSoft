import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  bodyClass?: string;
}

export default function usePageMeta({ title, description, bodyClass }: PageMeta) {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (!bodyClass) return;
    document.body.classList.add(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [title, description, bodyClass]);
}
