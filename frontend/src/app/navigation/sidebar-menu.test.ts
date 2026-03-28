import { describe, expect, it } from 'vitest';

import { getMenuItems } from './sidebar-menu';

describe('sidebar menu', () => {
  it('includes admin settings only for admins', () => {
    const adminItems = getMenuItems(true).map((item) => item.name);
    const nonAdminItems = getMenuItems(false).map((item) => item.name);

    expect(adminItems).toContain('Settings');
    expect(nonAdminItems).not.toContain('Settings');
  });

  it('keeps account navigation aligned with lowercase user route', () => {
    const account = getMenuItems(true).find((item) => item.name === 'Account');
    expect(account?.path).toBe('/user');
  });
});
