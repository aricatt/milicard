import React from 'react';

type GoodsNameTextProps = {
  text?: string | null;
};

export default function GoodsNameText({ text }: GoodsNameTextProps) {
  return (
    <span
      style={{
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {text || '-'}
    </span>
  );
}
