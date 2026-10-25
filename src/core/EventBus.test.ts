import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

interface TestEvents {
  ping: number;
  pong: string;
}

describe('EventBus', () => {
  it('entrega los datos a cada oyente del evento', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    bus.emit('ping', 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('no mezcla eventos distintos', () => {
    const bus = new EventBus<TestEvents>();
    const onPong = vi.fn();
    bus.on('pong', onPong);
    bus.emit('ping', 1);
    expect(onPong).not.toHaveBeenCalled();
  });

  it('deja de llamar al oyente después de quitarlo', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();
    bus.emit('ping', 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('sigue con los demás oyentes si uno falla', () => {
    const bus = new EventBus<TestEvents>();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    bus.on('ping', () => {
      throw new Error('falla');
    });
    bus.on('ping', after);
    bus.emit('ping', 7);
    expect(after).toHaveBeenCalledWith(7);
    spy.mockRestore();
  });
});
