import { describe, it, expect } from 'vitest';
import { toolThemes, relatedApp, rgba, type ToolKey } from './toolThemes';

const keys: ToolKey[] = ['merge', 'trim', 'convert', 'elevation', 'reduce', 'compare'];

describe('toolThemes', () => {
  it('has all six tool keys', () => {
    for (const k of keys) {
      expect(toolThemes[k]).toBeDefined();
    }
  });

  it('each tool theme has the required fields', () => {
    for (const k of keys) {
      const t = toolThemes[k];
      expect(t.tile).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.icon).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.title).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.subtitle).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.button).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('matches the spec palette exactly', () => {
    expect(toolThemes.merge).toMatchObject({
      tile: '#ecfdf5',
      icon: '#10b981',
      title: '#064e3b',
      subtitle: '#5b8c7d',
      button: '#059669'
    });
    expect(toolThemes.trim).toMatchObject({
      tile: '#eff6ff',
      icon: '#3b82f6',
      title: '#1e3a8a',
      subtitle: '#6b8fc7',
      button: '#1d4ed8'
    });
    expect(toolThemes.convert).toMatchObject({
      tile: '#fdf2f8',
      icon: '#ec4899',
      title: '#831843',
      subtitle: '#b06a8c',
      button: '#be185d'
    });
    expect(toolThemes.elevation).toMatchObject({
      tile: '#fef3c7',
      icon: '#f59e0b',
      title: '#92400e',
      subtitle: '#b45309',
      button: '#b45309'
    });
    expect(toolThemes.reduce).toMatchObject({
      tile: '#f3e8ff',
      icon: '#8b5cf6',
      title: '#4c1d95',
      subtitle: '#8a6fc0',
      button: '#6d28d9'
    });
    expect(toolThemes.compare).toMatchObject({
      tile: '#eef2ff',
      icon: '#6366f1',
      title: '#3730a3',
      subtitle: '#7c83c4',
      button: '#4f46e5'
    });
  });

  it('derives rgba strings from a tool accent hex', () => {
    expect(rgba(toolThemes.merge.button, 0.35)).toBe('rgba(5,150,105,0.35)');
    expect(rgba(toolThemes.compare.icon, 0.08)).toBe('rgba(99,102,241,0.08)');
  });

  it('exposes the cyan related-app palette', () => {
    expect(relatedApp).toMatchObject({
      tile: '#ecfeff',
      border: '#cdf0f5',
      icon: '#06b6d4',
      title: '#155e75',
      subtitle: '#5b9aa8'
    });
  });
});
