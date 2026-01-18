import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Modal } from './Modal';

interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen && !content) {
      fetch(`${import.meta.env.BASE_URL}how-to-play.md`)
        .then((res) => res.text())
        .then(setContent)
        .catch(() => setContent('Failed to load content.'));
    }
  }, [isOpen, content]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="markdown-content">
        <Markdown>{content}</Markdown>
      </div>
    </Modal>
  );
}
