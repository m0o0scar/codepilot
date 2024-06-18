import { SettingsButton } from '@components/settings/SettingsButton';

export const Navbar = () => {
  return (
    <div className="navbar bg-base-100 px-0">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">💻👨‍✈️ Code Pilot</a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <SettingsButton />
          </li>
        </ul>
      </div>
    </div>
  );
};
