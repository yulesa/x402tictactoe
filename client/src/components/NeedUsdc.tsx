import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Modal } from './Modal';

interface NeedUsdcProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NeedUsdc({ isOpen, onClose }: NeedUsdcProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen && !content) {
      fetch(`${import.meta.env.BASE_URL}need-usdc.md`)
        .then((res) => res.text())
        .then(setContent)
        .catch(() => setContent('Failed to load content.'));
    }
  }, [isOpen, content]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Need USDC?">
      <div className="markdown-content">
        <Markdown>{content}</Markdown>
      </div>
    </Modal>
  );
}
