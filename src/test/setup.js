import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 各テストの後に描画済みコンポーネントを片付ける（テスト同士が干渉しないように）
afterEach(cleanup);

// localStorage はテストごとにまっさらな状態から始める
afterEach(() => {
  localStorage.clear();
});
