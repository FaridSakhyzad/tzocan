import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';
import { TIMELINE_CELL_WIDTH } from '@/utils/timeline-core';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    timelineViewport: {
      overflow: 'hidden',
      paddingBottom: 11,
    },
    timelineContent: {
      flexDirection: 'row',
    },
    sidePad: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    sidePadLeft: {
      paddingRight: 5,
      justifyContent: 'flex-end',
    },
    sidePadIconBox: {
      width: 64,
      height: 64,
      position: 'absolute',
      top: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5
    },
    sidePadRight: {
      paddingLeft: 5,
      justifyContent: 'flex-start',
    },
    navBlock: {
      flexDirection: 'row',
      backgroundColor: theme.surface.fieldStrong,
      height: 64,
      flex: 1,
      borderCurve: 'continuous',
    },
    navBlockLeft: {
      justifyContent: 'flex-end',
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      borderCurve: 'continuous',
    },
    navBlockRight: {
      justifyContent: 'flex-start',
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      borderCurve: 'continuous',
    },
    navBlockIconBox: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center'
    },
    navArrow: {
      width: 18,
      height: 18,
    },
    navArrowLeft: {
      transform: [{ rotate: '180deg' }],
    },
    hourBox: {
      width: TIMELINE_CELL_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourBlock: {
      width: 64,
      height: 64,
      paddingTop: 4,
      borderRadius: 10,
      borderCurve: 'continuous',
      backgroundColor: theme.surface.fieldStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourBlock12hFormat: {
      paddingTop: 11,
      justifyContent: 'flex-start',
    },
    hourBlockMidnight: {
      paddingTop: 0,
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    midnightWeekday: {
      fontSize: 15,
      lineHeight: 17,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    midnightMonthDay: {
      fontSize: 15,
      lineHeight: 17,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    hourBlockHour: {
      fontSize: 36,
      lineHeight: 36,
      fontWeight: '300',
      color: theme.text.primary,
    },
    hourBlockAmPm: {
      fontSize: 14,
      lineHeight: 14,
      color: theme.text.primary,
      top: -3,
      textTransform: 'uppercase',
    },
    notificationCountBadge: {
      position: 'absolute',
      bottom: -8,
      minWidth: 18,
      height: 15,
      borderRadius: 8,
      borderCurve: 'continuous',
      paddingHorizontal: 5,
      flexDirection: 'row',
      gap: 2,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.primary,
    },
    notificationCountIcon: {
      width: 9,
      height: 9,
    },
    notificationCountText: {
      fontSize: 12,
      lineHeight: 13,
      color: theme.surface.button.subtleMedium,
    },
  });
}
