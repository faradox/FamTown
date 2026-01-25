/**
 * Navigation component with directional arrows
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

const ROUTES = {
  '/townsquare': { left: '/calendar', right: '/photos', up: '/sky', down: '/desk' },
  '/calendar': { right: '/townsquare', down: '/accounting' },
  '/photos': { left: '/townsquare' },
  '/sky': { down: '/townsquare' },
  '/desk': { up: '/townsquare' },
  '/accounting': { up: '/calendar' },
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoute = location.pathname;
  const routes = ROUTES[currentRoute];

  if (!routes) return null;

  const NavigationButton = ({ direction, to, Icon, position }) => {
    if (!to) return null;

    return (
      <button
        onClick={() => navigate(to)}
        className={`flex fixed ${position} items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-40 mobile-button`}
        aria-label={`Navigate ${direction}`}
      >
        <Icon className="w-6 h-6" />
      </button>
    );
  };

  return (
    <>
      <NavigationButton
        direction="left"
        to={routes.left}
        Icon={ChevronLeft}
        position="left-4 top-1/2 -translate-y-1/2"
      />
      <NavigationButton
        direction="right"
        to={routes.right}
        Icon={ChevronRight}
        position="right-4 top-1/2 -translate-y-1/2"
      />
      <NavigationButton
        direction="up"
        to={routes.up}
        Icon={ChevronUp}
        position="top-4 left-1/2 -translate-x-1/2"
      />
      <NavigationButton
        direction="down"
        to={routes.down}
        Icon={ChevronDown}
        position="bottom-4 left-1/2 -translate-x-1/2"
      />
    </>
  );
};

export default Navigation;

