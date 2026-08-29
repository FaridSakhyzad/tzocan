export enum RouteNames {
  root = '',
  cities = 'index',
  timeline = 'timeline',
  timelineInfinite = 'timeline-infinite',
  notifications = 'notifications',
  mainMenu = 'main-menu',
  editCity = 'edit-city',
  contact = 'contact',
  settings = 'settings',
  about = 'about',
  diagnostics = 'diagnostics',
}

export enum RouteNamePaths {
  root = '/' + RouteNames.root,
  cities = '/' + RouteNames.cities,
  timeline = '/' + RouteNames.timeline,
  timelineInfinite = '/' + RouteNames.timelineInfinite,
  notifications = '/' + RouteNames.notifications,
  mainMenu = '/' + RouteNames.mainMenu,
  editCity = '/' + RouteNames.editCity,
  contact = '/' + RouteNames.contact,
  settings = '/' + RouteNames.settings,
  about = '/' + RouteNames.about,
  diagnostics = '/' + RouteNames.diagnostics,
}
