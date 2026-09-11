import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { seedIfEmpty } from './lib/seed';
import { useAppRole } from './lib/hooks';
import { Box, Receipt, Pin, Grid, Bars, Shop, Clock, Person, Van } from './ui/icons';

import Welcome from './screens/Welcome';

import Today from './screens/dealer/Today';
import Billing from './screens/dealer/Billing';
import InvoiceView from './screens/dealer/InvoiceView';
import BillBook from './screens/dealer/BillBook';
import Pack from './screens/dealer/Pack';
import RouteScreen from './screens/dealer/RouteScreen';
import Catalog from './screens/dealer/Catalog';
import Incoming from './screens/dealer/Incoming';
import Ledger from './screens/dealer/Ledger';
import Reports from './screens/dealer/Reports';
import SyncScreen from './screens/dealer/SyncScreen';
import More from './screens/dealer/More';

import Browse from './screens/customer/Browse';
import Cart from './screens/customer/Cart';
import Track from './screens/customer/Track';
import Bills from './screens/customer/Bills';
import Account from './screens/customer/Account';

import Business from './screens/setup/Business';
import Team from './screens/setup/Team';

const SUPPLIER_NAV = [
  { to: '/', label: 'Orders', Icon: Box, end: true },
  { to: '/pack', label: 'Pack', Icon: Van },
  { to: '/dues', label: 'Dues', Icon: Bars },
  { to: '/route', label: 'Route', Icon: Pin },
  { to: '/stock', label: 'Stock', Icon: Grid },
  { to: '/more', label: 'More', Icon: Receipt },
];

const CUSTOMER_NAV = [
  { to: '/shop', label: 'Shop', Icon: Shop, end: true },
  { to: '/shop/orders', label: 'Orders', Icon: Clock },
  { to: '/shop/bills', label: 'Bills', Icon: Receipt },
  { to: '/shop/account', label: 'Account', Icon: Person },
];

function BottomNav({ warm }: { warm: boolean }) {
  const items = warm ? CUSTOMER_NAV : SUPPLIER_NAV;
  const on = warm ? '#2b2019' : '#16181a';
  const off = warm ? '#a89684' : '#6b6f76';
  return (
    <nav className="bottomnav">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>
          {({ isActive }) => (
            <>
              <Icon size={21} color={isActive ? on : off} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const role = useAppRole();

  if (role === 'loading') {
    return (
      <div className="frame" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="lbl">loading</span>
      </div>
    );
  }

  const onWelcome = pathname === '/welcome';
  const customerPath = pathname.startsWith('/shop');
  const warm = customerPath || (role === 'customer' && !onWelcome);

  // The two sides are separate products sharing a database. Keep them apart.
  // The role lives in Dexie, so it arrives a tick after it is written. Let the
  // guard move the user once it is actually set, rather than navigating
  // optimistically and bouncing back here.
  let redirect: string | null = null;
  if (role === 'none') {
    if (!onWelcome) redirect = '/welcome';
  } else if (onWelcome) {
    redirect = role === 'customer' ? '/shop' : '/';
  } else if (role === 'customer' && !customerPath) {
    redirect = '/shop';
  } else if (role === 'supplier' && customerPath) {
    redirect = '/';
  }

  const hideNav = onWelcome || /^\/(bill|invoice|setup)/.test(pathname) || pathname === '/shop/cart';

  return (
    <div className={'frame' + (warm ? ' warm' : '')}>
      {redirect ? (
        <Navigate to={redirect} replace />
      ) : (
        <Routes>
          <Route path="/welcome" element={<Welcome />} />

          <Route path="/" element={<Today />} />
          <Route path="/bill/:orderId?" element={<Billing />} />
          <Route path="/invoice/:id" element={<InvoiceView />} />
          <Route path="/bills" element={<BillBook />} />
          <Route path="/pack" element={<Pack />} />
          <Route path="/route" element={<RouteScreen />} />
          <Route path="/stock" element={<Catalog />} />
          <Route path="/incoming" element={<Incoming />} />
          <Route path="/dues" element={<Ledger />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/sync" element={<SyncScreen />} />
          <Route path="/more" element={<More />} />
          <Route path="/setup/business" element={<Business />} />
          <Route path="/setup/team" element={<Team />} />

          <Route path="/shop" element={<Browse />} />
          <Route path="/shop/cart" element={<Cart />} />
          <Route path="/shop/orders/:id?" element={<Track />} />
          <Route path="/shop/bills" element={<Bills />} />
          <Route path="/shop/account" element={<Account />} />

          <Route path="*" element={<Navigate to={role === 'customer' ? '/shop' : '/'} replace />} />
        </Routes>
      )}
      {!hideNav && role !== 'none' && <BottomNav warm={warm} />}
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((e) => {
        console.error(e);
        setReady(true);
      });
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);
  if (!ready) {
    return (
      <div className="frame" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="lbl">loading</span>
      </div>
    );
  }
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
