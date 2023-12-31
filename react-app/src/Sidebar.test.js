import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

class ResizeObserver {
  observe() {
      // do nothing
  }
  unobserve() {
      // do nothing
  }
  disconnect() {
      // do nothing
  }
}

window.ResizeObserver = ResizeObserver;
export default ResizeObserver;

test('renders Personal AI heading', () => {
  render(<Sidebar />);
  const linkElement = screen.getAllByText(/Content Source/i);
  expect(linkElement.length).toBe(2)
});
