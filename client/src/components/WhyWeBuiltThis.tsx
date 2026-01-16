import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Modal } from './Modal';

interface WhyWeBuiltThisProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhyWeBuiltThis({ isOpen, onClose }: WhyWeBuiltThisProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen && !content) {
      fetch('/why-we-built-this.md')
        .then((res) => res.text())
        .then(setContent)
        .catch(() => setContent('Failed to load content.'));
    }
  }, [isOpen, content]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Why We Built This">
      <div className="markdown-content">
        <Markdown>{content}</Markdown>
      </div>
    </Modal>
  );
}
