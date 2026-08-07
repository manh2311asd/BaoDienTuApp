import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  useWindowDimensions,
  Animated,
  Linking,
  Platform,
  Keyboard,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import { ApiClientError } from '../../services/api/client';
import { localDB } from '../../services/localDB';
import { Article, Comment } from '../../types/content';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Network from 'expo-network';
import { useToast } from '../../components/Toast/ToastContext';

// Import direct modular components
import DetailHeader from './DetailHeader';
import ShareRow from './ShareRow';
import CommentsSection from './CommentsSection';
import DiscoverTopics from './DiscoverTopics';
import RelatedArticles from './RelatedArticles';
import DetailBottomBar from './DetailBottomBar';
import { C, F_SERIF, F_SANS } from './constants';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { appTheme } from '../../theme/colors';
import {
  getArticleFontFamily,
  getArticleTextMetrics,
} from '../Settings/readingSettingsUi';
import {
  buildSpeechParagraphs,
  estimateSpeechMinutes,
} from './speechText';

export default function ArticleDetailScreen({ route, navigation }: any) {
  const { articleId, articleType, isOffline = false } = route.params;
  const { width } = useWindowDimensions();
  const {
    bookmarkedIds,
    articleFontFamily,
    articleFontSize,
    articleLineHeight,
    fontSize,
    getColors,
    showImages,
    themeMode,
    toggleBookmark,
    user,
    wifiOnlyDownloads,
  } = useAppStore();
  const colors = getColors();
  const shell = appTheme[themeMode];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [showVipConfirmation, setShowVipConfirmation] = useState(false);
  const [unlockingVip, setUnlockingVip] = useState(false);
  const [showSpeechHelp, setShowSpeechHelp] = useState(false);

  // Comments and Related Articles states
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reading Progress State
  const [scrollProgress, setScrollProgress] = useState(0);

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.9 | 1 | 1.25>(0.9);
  const [speechParagraphIndex, setSpeechParagraphIndex] = useState(0);
  const speechSessionRef = React.useRef(0);

  const speechParagraphs = React.useMemo(
    () =>
      buildSpeechParagraphs(
        article?.title,
        article?.sapo,
        article?.content || article?.previewContent
      ),
    [article]
  );
  const estimatedSpeechMinutes = React.useMemo(
    () => estimateSpeechMinutes(speechParagraphs),
    [speechParagraphs]
  );

  // Scroll Position tracking for Sticky Header transitions
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Collapsible header references (P1.5 auto-hiding logic)
  const headerTranslateY = React.useRef(new Animated.Value(0)).current;
  const lastScrollY = React.useRef(0);
  const headerVisible = React.useRef(true);

  const isBookmarked = bookmarkedIds.includes(articleId);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    localDB.isArticleOffline(articleId).then(setIsSavedOffline);
  }, [articleId]);

  useEffect(
    () => () => {
      speechSessionRef.current += 1;
      Speech.stop();
    },
    []
  );

  useEffect(() => {
    speechSessionRef.current += 1;
    Speech.stop();
    setIsPlayingAudio(false);
    setIsSpeechPaused(false);
    setSpeechParagraphIndex(0);
  }, [articleId]);

  const startSpeechAt = (
    startIndex: number,
    speed: 0.9 | 1 | 1.25 = playbackSpeed
  ) => {
    if (speechParagraphs.length === 0) {
      showToast('Bài viết chưa có nội dung để nghe');
      return;
    }

    const session = speechSessionRef.current + 1;
    speechSessionRef.current = session;
    const firstIndex = Math.min(
      Math.max(0, startIndex),
      speechParagraphs.length - 1
    );

    const speakNext = (index: number) => {
      if (speechSessionRef.current !== session) {
        return;
      }
      if (index >= speechParagraphs.length) {
        setIsPlayingAudio(false);
        setIsSpeechPaused(false);
        setSpeechParagraphIndex(0);
        showToast('Đã nghe hết bài viết');
        return;
      }

      setSpeechParagraphIndex(index);
      Speech.speak(speechParagraphs[index], {
        language: 'vi',
        rate: speed,
        pitch: 1,
        onStart: () => {
          if (speechSessionRef.current === session) {
            setIsPlayingAudio(true);
            setIsSpeechPaused(false);
          }
        },
        onDone: () => speakNext(index + 1),
        onError: () => {
          if (speechSessionRef.current !== session) {
            return;
          }
          setIsPlayingAudio(false);
          setIsSpeechPaused(false);
          setShowSpeechHelp(true);
        },
      });
    };

    setIsPlayingAudio(true);
    setIsSpeechPaused(false);
    Speech.stop().finally(() => {
      if (speechSessionRef.current === session) {
        speakNext(firstIndex);
      }
    });
  };

  const toggleSpeechPlayback = () => {
    if (isPlayingAudio) {
      speechSessionRef.current += 1;
      Speech.stop();
      setIsPlayingAudio(false);
      setIsSpeechPaused(true);
      return;
    }
    startSpeechAt(isSpeechPaused ? speechParagraphIndex : 0);
  };

  const stopSpeechPlayback = () => {
    speechSessionRef.current += 1;
    Speech.stop();
    setIsPlayingAudio(false);
    setIsSpeechPaused(false);
    setSpeechParagraphIndex(0);
  };

  const handleSpeedChange = (speed: 0.9 | 1 | 1.25) => {
    setPlaybackSpeed(speed);
    if (isPlayingAudio) {
      startSpeechAt(speechParagraphIndex, speed);
    }
  };

  const openSpeechSettings = async () => {
    setShowSpeechHelp(false);
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('com.android.settings.TTS_SETTINGS');
      } else {
        await Linking.openSettings();
      }
    } catch {
      showToast(
        'Mở Cài đặt thiết bị, chọn Chuyển văn bản thành giọng nói và cài giọng tiếng Việt.'
      );
    }
  };

  const readFullArticle = useCallback(async () => {
    const deviceId = await localDB.getDeviceId();
    const response = await apiClient.readArticle(articleId, deviceId);
    return response.data as Article;
  }, [articleId]);

  const loadVipPreview = useCallback(async () => {
    const response = await apiClient.getArticlePreview(articleId);
    return response.data as Article;
  }, [articleId]);

  const fetchArticleDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOffline) {
        const savedArticle = await localDB.getOfflineArticleDetail(articleId);
        if (!savedArticle) {
          setError('Bản offline không còn tồn tại trên thiết bị.');
          return;
        }
        setArticle(savedArticle);
        return;
      }

      if (articleType === 'VIP') {
        const preview = await loadVipPreview();

        if (
          preview.accessMode === 'VIP' ||
          preview.accessMode === 'ALREADY_READ'
        ) {
          setArticle(await readFullArticle());
          return;
        }

        setArticle(preview);
        setShowVipConfirmation(preview.accessMode === 'FREE_QUOTA');
        return;
      }

      setArticle(await readFullArticle());
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.status === 402 || err.status === 403)
      ) {
        try {
          setArticle(await loadVipPreview());
        } catch {
          setError('Không thể tải bản xem trước của bài viết.');
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải nội dung bài viết. Vui lòng kiểm tra kết nối.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [articleId, articleType, isOffline, loadVipPreview, readFullArticle]);

  const handleConfirmVipRead = useCallback(async () => {
    setUnlockingVip(true);
    try {
      setArticle(await readFullArticle());
      setShowVipConfirmation(false);
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.status === 402 || err.status === 403)
      ) {
        setArticle(await loadVipPreview());
        setShowVipConfirmation(false);
        showToast('Lượt đọc đã thay đổi. Vui lòng kiểm tra lựa chọn bên dưới.');
      } else {
        showToast(
          err instanceof Error
            ? err.message
            : 'Không thể mở toàn bộ bài viết lúc này.'
        );
      }
    } finally {
      setUnlockingVip(false);
    }
  }, [loadVipPreview, readFullArticle, showToast]);

  const handleToggleOffline = async () => {
    if (!article) {
      return;
    }

    if (isSavedOffline) {
      const removed = await localDB.deleteArticleOffline(articleId);
      if (removed) {
        setIsSavedOffline(false);
        showToast('Đã xóa bản tải xuống');
      }
      return;
    }

    if (!article.content) {
      showToast('Bản xem trước VIP không thể tải xuống');
      return;
    }

    if (wifiOnlyDownloads) {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (networkState.type !== Network.NetworkStateType.WIFI) {
          showToast('Hãy kết nối Wi-Fi để tải bài offline');
          return;
        }
      } catch {
        showToast('Chưa thể kiểm tra kết nối mạng');
        return;
      }
    }

    const saved = await localDB.saveArticleOffline(article as Article);
    if (saved) {
      setIsSavedOffline(true);
      showToast('Đã lưu bài để đọc offline');
    } else {
      showToast('Không thể lưu bài viết trên thiết bị');
    }
  };

  const handleToggleBookmark = async () => {
    if (!article) {
      return;
    }

    const succeeded = isBookmarked
      ? await localDB.deleteBookmarkedArticle(articleId)
      : await localDB.saveBookmarkedArticle(article as Article);

    if (!succeeded) {
      showToast('Không thể cập nhật bài đã lưu');
      return;
    }

    toggleBookmark(articleId);
    showToast(isBookmarked ? 'Đã bỏ lưu bài viết' : 'Đã lưu bài viết');
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nĐọc bài viết đầy đủ tại NewsDaily:\n${article.sapo}`,
      });
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiClient.getComments(articleId);
      setComments(res.data || []);
    } catch (err) {
      console.error('Lỗi tải bình luận:', err);
    }
  }, [articleId]);

  const fetchRelatedArticles = useCallback(async () => {
    try {
      const catId = article?.categoryId;
      const res = await apiClient.searchArticles({
        categoryId: catId || undefined,
        origin: article?.origin || 'INTERNAL'
      });
      const dataList: Article[] = res.data && 'content' in res.data
        ? (res.data as { content: Article[] }).content
        : res.data;
      const filtered = (dataList || [])
        .filter((item: Article) => item.id !== articleId)
        .slice(0, 3);
      setRelatedArticles(filtered);
    } catch (err) {
      console.error('Lỗi tải tin liên quan:', err);
    }
  }, [article?.categoryId, article?.origin, articleId]);

  useEffect(() => {
    fetchArticleDetail();
  }, [fetchArticleDetail]);

  useEffect(() => {
    if (article && !isOffline) {
      localDB.saveRecentArticle(article);
      fetchComments();
      fetchRelatedArticles();
    } else if (isOffline) {
      setComments([]);
      setRelatedArticles([]);
    }
  }, [article, fetchComments, fetchRelatedArticles, isOffline]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await apiClient.addComment(articleId, commentText);
      showToast('Đã gửi bình luận thành công');
      setCommentText('');
      fetchComments();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gửi bình luận thất bại'
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm} GMT+7`;
  };

  // Scroll position monitor for reading progress and collapsible header
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const total = contentSize.height - layoutMeasurement.height;
    if (total > 0) {
      setScrollProgress(Math.max(0, Math.min(1, contentOffset.y / total)));
    }

    const currentY = contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 10) {
      if (!headerVisible.current) {
        headerVisible.current = true;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }
    } else if (diff > 12 && currentY > 60) {
      if (headerVisible.current) {
        headerVisible.current = false;
        Animated.timing(headerTranslateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
    } else if (diff < -12) {
      if (!headerVisible.current) {
        headerVisible.current = true;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }
    }
    lastScrollY.current = currentY;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={C.ink} />
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Bài viết không tồn tại'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchArticleDetail}>
          <Text style={styles.retryBtnText}>Tải lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Interpolate values for category/title fade actions if needed
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const bodyMetrics = getArticleTextMetrics(
    17,
    27,
    articleFontSize,
    articleLineHeight
  );
  const sapoMetrics = getArticleTextMetrics(
    16,
    24,
    articleFontSize,
    articleLineHeight
  );
  const articleFont = getArticleFontFamily(articleFontFamily);
  const bodyFontSize = bodyMetrics.fontSize;
  const bodyLineHeight = bodyMetrics.lineHeight;

  const tagsStyles = {
    p: {
      fontFamily: articleFont,
      color: colors.text,
      fontSize: bodyFontSize,
      lineHeight: bodyLineHeight,
      marginBottom: 16,
    },
    ol: {
      fontFamily: articleFont,
      color: colors.text,
      fontSize: bodyFontSize,
      marginBottom: 16,
    },
    li: {
      fontFamily: articleFont,
      fontSize: bodyFontSize,
      lineHeight: bodyLineHeight,
      marginBottom: 12,
    },
  };

  const remainingFreeReads = article.remainingFreeReads ?? 0;
  const paywallTitle =
    article.accessMode === 'FREE_QUOTA'
      ? 'Dùng 1 lượt để đọc toàn bộ'
      : article.accessMode === 'LOGIN_REQUIRED'
        ? 'Đăng nhập để tiếp tục'
        : 'Bạn đã dùng hết lượt miễn phí';
  const paywallDescription =
    article.accessMode === 'FREE_QUOTA'
      ? `Bạn còn ${remainingFreeReads} lượt đọc VIP miễn phí trong tháng này.`
      : article.accessMode === 'LOGIN_REQUIRED'
        ? 'Đăng nhập để sử dụng 3 lượt đọc VIP miễn phí mỗi tháng.'
        : 'Chọn gói thành viên để đọc không giới hạn toàn bộ nội dung VIP.';
  const paywallButtonLabel =
    article.accessMode === 'FREE_QUOTA'
      ? 'Xác nhận đọc'
      : article.accessMode === 'LOGIN_REQUIRED'
        ? 'Đăng nhập'
        : 'Xem gói thành viên';

  const handlePaywallAction = () => {
    if (article.accessMode === 'FREE_QUOTA') {
      setShowVipConfirmation(true);
      return;
    }

    if (article.accessMode === 'LOGIN_REQUIRED') {
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
      return;
    }

    navigation.navigate('VipPackages');
  };

  return (
    <View style={[styles.root, { backgroundColor: shell.appReadingBackground }]}>
      {/* Header bar (Notch safe & Sticky) */}
      <DetailHeader
        article={article}
        navigation={navigation}
        insets={insets}
        scrollProgress={scrollProgress}
        headerBorderOpacity={headerBorderOpacity}
        headerTranslateY={headerTranslateY}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: 48 + (insets.top > 0 ? insets.top : 20) + 8,
            paddingBottom: 120
          }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: handleScroll,
          }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Category Badge & Timestamp Row */}
          <View style={styles.metaTopRow}>
            <View style={styles.categoryPillBadge}>
              <Text style={styles.categoryPillText}>
                {article.categoryName || 'Tin tức'}
              </Text>
            </View>
            <Text style={styles.metaDateText}>{formatDate(article.createdAt)}</Text>
          </View>

          {/* Article Title */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: scaleFont(24, fontSize),
                lineHeight: scaleLineHeight(32, fontSize),
              },
            ]}
          >
            {article.title}
          </Text>

          {/* Author Profile Row */}
          <TouchableOpacity
            style={styles.metaAuthorRow}
            disabled={!article.authorId}
            onPress={() =>
              navigation.navigate('AuthorDetail', {
                authorId: article.authorId,
                authorName: article.authorName,
              })
            }
          >
            <View style={styles.authorAvatarCircle}>
              <Text style={styles.authorAvatarText}>
                {article.authorName ? article.authorName.charAt(0).toUpperCase() : 'A'}
              </Text>
            </View>
            <Text style={styles.metaAuthorName}>{article.authorName || 'Tác giả'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.listenButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={toggleSpeechPlayback}
          >
            <View
              style={[
                styles.listenPlayMark,
                { backgroundColor: colors.text },
              ]}
            >
              <Text
                style={[
                  styles.listenPlayGlyph,
                  { color: colors.background },
                ]}
              >
                {isPlayingAudio ? 'Ⅱ' : '▶'}
              </Text>
            </View>
            <View style={styles.listenCopy}>
              <Text style={[styles.listenTitle, { color: colors.text }]}>
                {isPlayingAudio
                  ? 'Đang nghe bài'
                  : isSpeechPaused
                    ? 'Tiếp tục nghe'
                    : 'Nghe bài viết'}
              </Text>
              <Text style={[styles.listenHint, { color: colors.textMuted }]}>
                Khoảng {estimatedSpeechMinutes} phút · Giọng tiếng Việt
              </Text>
            </View>
            <Text style={[styles.listenAction, { color: colors.primary }]}>
              {playbackSpeed}x
            </Text>
          </TouchableOpacity>

          {/* Social Share Buttons Row */}
          <ShareRow handleShare={handleShare} />

          <View style={styles.thinDivider} />

          {/* Sapo (Summary of Article) */}
          {article.sapo && (
            <Text
              style={[
                styles.sapo,
                {
                  color: colors.textMuted,
                  fontFamily: articleFont,
                  fontSize: sapoMetrics.fontSize,
                  lineHeight: sapoMetrics.lineHeight,
                },
              ]}
            >
              {article.sapo}
            </Text>
          )}

          <View style={styles.divider} />

          {/* Article Body Content with Images */}
          <RenderHtml
            contentWidth={width - 32}
            source={{ html: article.content || article.previewContent || '' }}
            baseStyle={{
              color: colors.text,
              fontFamily: articleFont,
              fontSize: bodyFontSize,
              lineHeight: bodyLineHeight,
            }}
            tagsStyles={tagsStyles as any}
            ignoredStyles={['fontSize', 'lineHeight']}
            ignoredDomTags={isOffline || !showImages ? ['img'] : []}
            enableExperimentalMarginCollapsing
          />

          {article.paywallRequired && (
            <View
              style={[
                styles.maskedContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {[92, 84, 96, 70, 88].map((lineWidth) => (
                <View
                  key={lineWidth}
                  style={[
                    styles.maskedLine,
                    {
                      width: `${lineWidth}%`,
                      backgroundColor: colors.border,
                    },
                  ]}
                />
              ))}
              <View
                style={[
                  styles.maskOverlay,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.maskLabel, { color: colors.textMuted }]}>
                  NỘI DUNG CÒN LẠI ĐÃ ĐƯỢC CHE
                </Text>
              </View>
            </View>
          )}

          {article.paywallRequired && (
            <View style={styles.paywallCard}>
              <Text style={styles.paywallEyebrow}>NỘI DUNG DÀNH CHO VIP</Text>
              <Text style={[styles.paywallTitle, { color: colors.text }]}>
                {paywallTitle}
              </Text>
              <Text style={[styles.paywallDescription, { color: colors.textMuted }]}>
                {paywallDescription}
              </Text>
              <TouchableOpacity
                style={[styles.paywallButton, { backgroundColor: colors.text }]}
                onPress={handlePaywallAction}
              >
                <Text
                  style={[styles.paywallButtonText, { color: colors.background }]}
                >
                  {paywallButtonLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          {/* Comments Section */}
          {!isOffline && (
            <CommentsSection
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              submittingComment={submittingComment}
              handleAddComment={handleAddComment}
              formatDate={formatDate}
              canComment={Boolean(user)}
            />
          )}

          <View style={styles.divider} />

          {/* Explore Topics Section */}
          <DiscoverTopics categoryName={article.categoryName} />

          <View style={styles.divider} />

          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <RelatedArticles relatedArticles={relatedArticles} navigation={navigation} />
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Utility Toolbar: Normal & Active TTS Mode */}
      {!isKeyboardVisible && (
        <DetailBottomBar
          navigation={navigation}
          isPlayingAudio={isPlayingAudio}
          isSpeechPaused={isSpeechPaused}
          toggleSpeechPlayback={toggleSpeechPlayback}
          stopSpeechPlayback={stopSpeechPlayback}
          isBookmarked={isBookmarked}
          toggleBookmark={handleToggleBookmark}
          handleShare={handleShare}
          playbackSpeed={playbackSpeed}
          handleSpeedChange={handleSpeedChange}
          speechParagraphIndex={speechParagraphIndex}
          speechParagraphCount={speechParagraphs.length}
          insets={insets}
          isSavedOffline={isSavedOffline}
          handleToggleOffline={handleToggleOffline}
        />
      )}

      <AppActionSheet
        visible={showVipConfirmation}
        eyebrow="BÀI VIẾT VIP"
        title="Dùng 1 lượt đọc miễn phí?"
        description={`Bạn còn ${remainingFreeReads} lượt trong tháng này. Sau khi mở bài, bạn sẽ còn ${Math.max(0, remainingFreeReads - 1)} lượt.`}
        primaryLabel="Xác nhận đọc"
        secondaryLabel="Để sau"
        tone="vip"
        loading={unlockingVip}
        onPrimary={handleConfirmVipRead}
        onClose={() => setShowVipConfirmation(false)}
      />

      <AppActionSheet
        visible={showSpeechHelp}
        eyebrow="GIỌNG ĐỌC TIẾNG VIỆT"
        title="Thiết bị chưa cài giọng Việt"
        description="Chọn Speech Services by Google làm công cụ ưu tiên, sau đó tải dữ liệu giọng tiếng Việt. Quay lại ứng dụng và nhấn Nghe bài một lần nữa."
        primaryLabel="Mở cài đặt giọng đọc"
        secondaryLabel="Để sau"
        onPrimary={openSpeechSettings}
        onClose={() => setShowSpeechHelp(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingBottom: 48,
  },
  content: {
    padding: 16,
    paddingTop: 28,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryPillBadge: {
    backgroundColor: C.accentBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontFamily: F_SANS,
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  metaDateText: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: C.muted,
    marginLeft: 10,
  },
  metaAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  authorAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: appTheme.light.appSurfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  authorAvatarText: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  metaAuthorName: {
    fontFamily: F_SANS,
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  listenButton: {
    minHeight: 64,
    marginBottom: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  listenPlayMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  listenPlayGlyph: {
    fontSize: 13,
    fontWeight: '800',
  },
  listenCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  listenTitle: {
    fontFamily: F_SERIF,
    fontSize: 15,
    fontWeight: '700',
  },
  listenHint: {
    marginTop: 3,
    fontFamily: F_SANS,
    fontSize: 10,
  },
  listenAction: {
    fontFamily: F_SANS,
    fontSize: 11,
    fontWeight: '800',
  },
  thinDivider: {
    height: 1,
    backgroundColor: appTheme.light.appBorder,
    marginVertical: 14,
  },
  title: {
    fontFamily: F_SERIF,
    fontSize: 24,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 32,
    marginBottom: 12,
  },
  titleSmall: {
    fontSize: 22,
    lineHeight: 29,
  },
  titleLarge: {
    fontSize: 28,
    lineHeight: 36,
  },
  sapo: {
    fontFamily: F_SERIF,
    fontSize: 16,
    color: appTheme.light.appTextPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sapoSmall: {
    fontSize: 15,
    lineHeight: 22,
  },
  sapoLarge: {
    fontSize: 19,
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 20,
  },
  maskedContent: {
    position: 'relative',
    height: 156,
    marginTop: -6,
    marginBottom: 14,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 8,
  },
  maskedLine: {
    height: 10,
    marginBottom: 14,
    borderRadius: 3,
    opacity: 0.72,
  },
  maskOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 48,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  maskLabel: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  paywallCard: {
    marginBottom: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    borderRadius: 8,
    backgroundColor: appTheme.light.appYellowContainer,
  },
  paywallEyebrow: {
    color: appTheme.light.appWarning,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  paywallTitle: {
    marginTop: 7,
    fontFamily: F_SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  paywallDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  paywallButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    marginTop: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 5,
  },
  paywallButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontFamily: F_SANS,
    fontSize: 15,
    color: C.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: C.ink,
  },
  retryBtnText: {
    fontFamily: F_SANS,
    fontSize: 14,
    color: appTheme.light.appHeaderText,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalHeading: {
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  reportOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  reportOptionText: {
    fontFamily: F_SANS,
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
  modalCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: appTheme.light.appSurfaceMuted,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: F_SANS,
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
});
