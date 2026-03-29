import { describe, expect, it } from 'vitest';

import { getMenuItems, matchesMenuItemPath } from './sidebar-menu';

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

  it('treats environment detail and edit routes as active under Manage', () => {
    const environments = getMenuItems(true).find((item) => item.name === 'Environments');
    const manage = environments?.children?.find((item) => item.name === 'Manage');

    expect(manage).toBeTruthy();
    expect(environments?.children?.find((item) => item.name === 'Resources')).toBeFalsy();
    expect(matchesMenuItemPath(manage!, '/environment/manage')).toBe(true);
    expect(matchesMenuItemPath(manage!, '/environment/create')).toBe(true);
    expect(matchesMenuItemPath(manage!, '/environment/edit/env-1')).toBe(true);
    expect(matchesMenuItemPath(manage!, '/environment/env-1')).toBe(true);
    expect(matchesMenuItemPath(manage!, '/environment/schedules')).toBe(false);
  });
});
