import business from './th-TH/business';
import component from './th-TH/component';
import globalHeader from './th-TH/globalHeader';
import menu from './th-TH/menu';
import pages from './th-TH/pages';
import pwa from './th-TH/pwa';
import settingDrawer from './th-TH/settingDrawer';
import settings from './th-TH/settings';

export default {
  'navBar.lang': 'ภาษา',
  'layout.user.link.help': 'ช่วยเหลือ',
  'layout.user.link.privacy': 'ความเป็นส่วนตัว',
  'layout.user.link.terms': 'ข้อกำหนด',
  'app.preview.down.block': 'ดาวน์โหลดหน้านี้ไปยังโปรเจกต์ท้องถิ่น',
  'app.welcome.link.fetch-blocks': 'รับบล็อกทั้งหมด',
  'app.welcome.link.block-list': 'สร้างหน้ามาตรฐานอย่างรวดเร็วตามการพัฒนา block',
  ...pages,
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...business,
};
