import { useEffect } from 'react';

export default function usePageMeta({ title, description, bodyClass }) {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (!bodyClass) return;
    document.body.classList.add(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [title, description, bodyClass]);
}
