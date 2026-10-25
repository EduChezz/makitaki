type Handler<T> = (data: T) => void;

/** Bus de eventos tipado: los módulos solo se comunican a través de él. */
export class EventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  /** Registra una función y devuelve otra que la quita. */
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      // Un módulo que falla no debe detener a los demás.
      try {
        (handler as Handler<Events[K]>)(data);
      } catch (err) {
        console.error(`Error en un oyente de "${String(event)}":`, err);
      }
    }
  }
}
