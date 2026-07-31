import { useAppStore } from '../src/store/useAppStore';
import { Subscription } from '../src/types/content';

const authorFollow: Subscription = {
  id: 20,
  targetType: 'AUTHOR',
  targetId: 8,
  targetName: 'Nguyễn Minh An',
};

describe('app store reading and following state', () => {
  beforeEach(() => {
    useAppStore.setState({
      fontSize: 'medium',
      subscriptions: [],
      user: null,
    });
  });

  it('chấp nhận mức chữ rất lớn', () => {
    useAppStore.getState().setFontSize('xlarge');
    expect(useAppStore.getState().fontSize).toBe('xlarge');
  });

  it('thêm một nhà báo đang theo dõi', () => {
    useAppStore.getState().addSubscription(authorFollow);
    expect(useAppStore.getState().subscriptions).toEqual([authorFollow]);
  });

  it('không nhân đôi cùng một nhà báo khi cập nhật', () => {
    useAppStore.getState().addSubscription(authorFollow);
    useAppStore.getState().addSubscription({
      ...authorFollow,
      id: 21,
      targetName: 'Nguyễn Minh An mới',
    });

    expect(useAppStore.getState().subscriptions).toHaveLength(1);
    expect(useAppStore.getState().subscriptions[0].id).toBe(21);
  });

  it('xóa đúng nhà báo khỏi danh sách theo dõi', () => {
    useAppStore.getState().setSubscriptions([
      authorFollow,
      {
        id: 22,
        targetType: 'CATEGORY',
        targetId: 8,
        targetName: 'Công nghệ',
      },
    ]);
    useAppStore.getState().removeSubscription('AUTHOR', 8);

    expect(useAppStore.getState().subscriptions).toEqual([
      expect.objectContaining({ targetType: 'CATEGORY' }),
    ]);
  });

  it('xóa dữ liệu theo dõi theo tài khoản khi đăng xuất', () => {
    useAppStore.getState().setSubscriptions([authorFollow]);
    useAppStore.getState().logout();

    expect(useAppStore.getState().subscriptions).toEqual([]);
  });
});
