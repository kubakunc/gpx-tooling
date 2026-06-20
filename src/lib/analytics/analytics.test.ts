import { describe, it, expect, vi } from 'vitest';
import { Analytics, type AnalyticsLike } from './analytics';

function setup(isNative: boolean) {
  const logEvent = vi.fn().mockResolvedValue(undefined);
  const setCurrentScreen = vi.fn().mockResolvedValue(undefined);
  const setEnabled = vi.fn().mockResolvedValue(undefined);
  const impl: AnalyticsLike = { logEvent, setCurrentScreen, setEnabled };
  const a = new Analytics({ impl, isNative: () => isNative });
  return { a, logEvent };
}

describe('Analytics', () => {
  it('logs events on native with name + params', async () => {
    const { a, logEvent } = setup(true);
    await a.track('custom', { x: 1 });
    expect(logEvent).toHaveBeenCalledWith({ name: 'custom', params: { x: 1 } });
  });

  it('is a no-op on web (never calls the plugin)', async () => {
    const { a, logEvent } = setup(false);
    await a.track('custom', { x: 1 });
    await a.toolOpen('merge');
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('swallows plugin errors so telemetry never breaks a flow', async () => {
    const { a, logEvent } = setup(true);
    logEvent.mockRejectedValueOnce(new Error('no google-services.json'));
    await expect(a.track('custom')).resolves.toBeUndefined();
  });

  it('toolOpen records the tool name', async () => {
    const { a, logEvent } = setup(true);
    await a.toolOpen('trim');
    expect(logEvent).toHaveBeenCalledWith({ name: 'tool_open', params: { tool: 'trim' } });
  });

  it('fileImport records tool, format and count', async () => {
    const { a, logEvent } = setup(true);
    await a.fileImport('merge', 'gpx', 2);
    expect(logEvent).toHaveBeenCalledWith({
      name: 'file_import',
      params: { tool: 'merge', format: 'gpx', count: 2 }
    });
  });

  it('fileShare records tool and format', async () => {
    const { a, logEvent } = setup(true);
    await a.fileShare('convert', 'tcx');
    expect(logEvent).toHaveBeenCalledWith({
      name: 'file_share',
      params: { tool: 'convert', format: 'tcx' }
    });
  });

  it('fileSave records the save result', async () => {
    const { a, logEvent } = setup(true);
    await a.fileSave('reduce', 'gpx', 'saved');
    expect(logEvent).toHaveBeenCalledWith({
      name: 'file_save',
      params: { tool: 'reduce', format: 'gpx', result: 'saved' }
    });
    await a.fileSave('reduce', 'gpx', 'cancelled');
    expect(logEvent).toHaveBeenLastCalledWith({
      name: 'file_save',
      params: { tool: 'reduce', format: 'gpx', result: 'cancelled' }
    });
  });

  it('toolAction merges extra params alongside tool + action', async () => {
    const { a, logEvent } = setup(true);
    await a.toolAction('time', 'shift', { seconds: 60 });
    expect(logEvent).toHaveBeenCalledWith({
      name: 'tool_action',
      params: { tool: 'time', action: 'shift', seconds: 60 }
    });
  });
});
