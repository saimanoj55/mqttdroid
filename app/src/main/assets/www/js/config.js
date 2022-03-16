angular.module('ngApp.config', [])

/*
 * ---------------------------------------------------
 * Made with Pepper Proximity Marketing Platform
 *
 * For more information visit 
 * madewithpepper.com
 * ---------------------------------------------------
 */

.constant('PROXIMITY_PLATFORM', {

  /*
   * ---------------------------------------------------
   * If enabled is set to true, the extra features
   * will be used. If set to false, there will be
   * no connection with an external server.
   * ---------------------------------------------------
   */

  enabled: true,

  /*
   * ---------------------------------------------------
   * The Proximity Platform API endpoint
   * ---------------------------------------------------
   */

  api_endpoint: 'https://platform.madewithpepper.com',

  /*
   * ---------------------------------------------------
   * SQLite db config
   * 
   * location
   * 0 (default): Documents - visible to iTunes and backed up by iCloud
   * 1: Library - backed up by iCloud, NOT visible to iTunes
   * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
   * ---------------------------------------------------
   */

  sqlite: {
    db_name: 'mwp_data.db',
    location: 2,
    androidDatabaseImplementation: 2,
    androidLockWorkaround: 1
  }
})

.constant('APPS', {

  /*
   * ---------------------------------------------------
   * Apps which are bookmarked by default, no need to
   * scan a QR or enter a code. This array of urls (and 
   * associated scenarios) is only loaded after opening
   * the app for the first time.
   *
   * E.g.: ['https://platform.madewithpepper.com/mobile/tour360']
   * ---------------------------------------------------
   */

  default: [],

  /*
   * ---------------------------------------------------
   * True if default apps can't be deleted by the user.
   * ---------------------------------------------------
   */

  persistent: false
});