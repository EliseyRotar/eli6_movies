import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE_BASE_URL } from '../config';
import { CatalogItem } from '../types';
import { colors } from '../theme';

interface Props {
  item: CatalogItem;
  season?: number;
  episode?: number;
}

export function PlayerScreen({ item, season, episode }: Props) {
  const type = item.type || item.media_type || 'movie';
  let url = `${SITE_BASE_URL}/app/watch/${type}/${item.id}?fromApp=1`;
  if (season != null && episode != null) {
    url += `&season=${season}&episode=${episode}`;
  }

  return (
    <View style={styles.root}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        userAgent={`Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 eli6movies/1.0`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  webview: {
    flex: 1,
  },
});
