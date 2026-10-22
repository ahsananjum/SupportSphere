import { describe, expect, it } from 'vitest';
import { libraryFilters, libraryHref } from '../../lib/knowledge/library';

describe('UP-U3-01 library navigation', () => {
  it('bounds untrusted search/page values and ignores repeated keys', () => {
    expect(libraryFilters({ page: ['1', '2'], q: ['x', 'y'] })).toEqual({
      page: 0,
      query: '',
    });
    expect(libraryFilters({ page: '-2', q: ' %_,(Guide) ' })).toEqual({
      page: 0,
      query: 'Guide',
    });
    expect(libraryFilters({ page: '3', q: 'Library 66' })).toEqual({
      page: 2,
      query: 'Library 66',
    });
    expect(libraryHref({ page: 1, query: 'Library 66' })).toBe(
      '/app/knowledge?q=Library+66&page=2',
    );
  });
});
