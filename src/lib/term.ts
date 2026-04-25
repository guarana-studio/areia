import type { TerminalOptions } from "@scelar/nodepod";
import { WTerm } from "@wterm/dom";

type T = TerminalOptions["Terminal"];

export class WTermAdapter implements T {
  private wterm: WTerm | null = null;
  private _pendingWrites: string[] = [];
  private _ready = false;
  private _onDataCb: ((data: string) => void) | null = null;
  private _onResizeCb: (() => void) | null = null;
  public cols = 80;
  public rows = 24;
  public options: any;

  constructor(options: any = {}) {
    this.options = options;
  }

  open(container: HTMLElement) {
    this.wterm = new WTerm(container, {
      cursorBlink: this.options.cursorBlink,
      onData: (data: string) => this._onDataCb?.(data),
      onResize: (cols: number, rows: number) => {
        this.cols = cols;
        this.rows = rows;
        this._onResizeCb?.();
      },
      rows: 8,
    });
    this.wterm.init().then(() => {
      this._ready = true;
      for (const data of this._pendingWrites) {
        this.wterm?.write(data);
      }
      this._pendingWrites = [];
    });
  }

  write(data: string | Uint8Array) {
    const str = typeof data === "string" ? data : new TextDecoder().decode(data);
    if (this._ready && this.wterm) {
      this.wterm.write(str);
    } else {
      this._pendingWrites.push(str);
    }
  }

  loadAddon() {
    // WTerm does not support addons
  }

  onData(callback: (data: string) => void) {
    this._onDataCb = callback;
    return {
      dispose: () => {
        this._onDataCb = null;
      },
    };
  }

  onResize(callback: () => void) {
    this._onResizeCb = callback;
    return {
      dispose: () => {
        this._onResizeCb = null;
      },
    };
  }

  focus() {
    this.wterm?.focus();
  }

  clear() {
    this.write("\x1Bc");
  }

  dispose() {
    this.wterm?.destroy();
    this.wterm = null;
    this._ready = false;
  }
}
