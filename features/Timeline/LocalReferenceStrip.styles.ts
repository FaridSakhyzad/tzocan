import { StyleSheet } from 'react-native';

import type { UiTheme } from '@/constants/ui-theme.types';
import { TIMELINE_CELL_WIDTH } from '@/utils/timeline-core';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    timelineViewport: {
      overflow: 'hidden',
    },
    timelineContent: {
      flexDirection: 'row',
    },
    sidePad: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    sidePadRubberPlaceholder: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.border.muted,
      position: 'absolute',
      top: 0,
      height: '100%',
      width: '100%',
    },
    sidePadLeft: {
      paddingRight: 5,
    },
    sidePadRight: {
      paddingLeft: 5,
    },
    navBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border.muted,
      height: 24,
      flex: 1,
      position: 'relative',
    },
    navBlockLeft: {
      justifyContent: 'flex-end',
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      borderLeftWidth: 0,
    },
    navBlockRight: {
      justifyContent: 'flex-start',
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      borderRightWidth: 0,
    },
    navBlockIconBox: {
      width: 64,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center'
    },
    sideDateText: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.warning,
      textTransform: 'capitalize',
      paddingHorizontal: 10,
    },
    sideDateTextLeft: {
      textAlign: 'right',
    },
    sideDateTextRight: {
      textAlign: 'left',
    },
    navArrow: {
      width: 18,
      height: 18
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
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourLabelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    hourBlockHour: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
    },
    hourBlockAmPm: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'uppercase',
    },
    hourBlockMidnight: {},
    midnightWeekday: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
      textAlign: "center",
    },
    midnightMonthDay: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
      textAlign: "center",
    },
  });
}
