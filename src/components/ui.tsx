import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C, R} from '../theme';
import {initials} from '../utils';

/* ------------------------------ Screen ------------------------------ */

export function Screen({
  title,
  onBack,
  right,
  children,
  scroll = true,
  dark = false,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, dark && {backgroundColor: C.board}]}>
      <View style={[s.header, {paddingTop: insets.top + 8}]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={s.back}>
            <Text style={s.backTxt}>‹</Text>
          </Pressable>
        ) : (
          <View style={{width: 8}} />
        )}
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={s.headerRight}>{right}</View>
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.content, {paddingBottom: insets.bottom + 32}]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[s.flex, {paddingBottom: insets.bottom}]}>{children}</View>
      )}
    </View>
  );
}

/* ------------------------------ Botones ----------------------------- */

export function Btn({
  title,
  onPress,
  color = C.primary,
  variant = 'solid',
  disabled,
  style,
  big,
  small,
  subtitle,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
  small?: boolean;
  subtitle?: string;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        s.btn,
        big && s.btnBig,
        small && s.btnSmall,
        solid && {backgroundColor: color},
        variant === 'outline' && {borderColor: color, borderWidth: 2},
        pressed && {opacity: 0.7},
        disabled && {opacity: 0.35},
        style,
      ]}>
      <Text
        style={[
          s.btnTxt,
          big && {fontSize: 19},
          small && {fontSize: 13},
          {color: solid ? '#fff' : color},
        ]}
        numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[s.btnSub, {color: solid ? '#ffffffcc' : color}]}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string;
  name: string;
  size?: number;
}) {
  const st = {width: size, height: size, borderRadius: size / 2};
  if (uri) {
    return <Image source={{uri}} style={[st, {backgroundColor: C.border}]} />;
  }
  return (
    <View style={[st, s.avatarFallback]}>
      <Text style={{color: '#fff', fontWeight: '700', fontSize: size * 0.38}}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}

/* ------------------------------ Varios ------------------------------ */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({children}: {children: React.ReactNode}) {
  return <Text style={s.section}>{children}</Text>;
}

export function Empty({text}: {text: string}) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Row({
  children,
  onPress,
  onLongPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({pressed}) => [s.row, pressed && {backgroundColor: '#EEF3EF'}, style]}>
      {children}
    </Pressable>
  );
}

export function Field(props: TextInputProps & {label: string}) {
  const {label, style, ...rest} = props;
  return (
    <View style={{marginBottom: 14}}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
        {...rest}
        style={[s.input, style]}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = C.primary,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        {borderColor: color},
        selected && {backgroundColor: color},
      ]}>
      <Text style={[s.chipTxt, {color: selected ? '#fff' : color}]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------ Sheet ------------------------------- */

export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.flex} onPress={onClose} />
        <View style={[s.sheet, {paddingBottom: insets.bottom + 12}]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={s.sheetClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={{flexShrink: 1}}
            contentContainerStyle={{padding: 16}}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={s.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  flex: {flex: 1},
  screen: {flex: 1, backgroundColor: C.bg},
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  back: {paddingHorizontal: 10},
  backTxt: {color: '#fff', fontSize: 34, lineHeight: 34, fontWeight: '300'},
  headerTitle: {flex: 1, color: '#fff', fontSize: 20, fontWeight: '700'},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8},
  content: {padding: 16},
  btn: {
    borderRadius: R,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnBig: {minHeight: 64, paddingVertical: 16},
  btnSmall: {minHeight: 34, paddingVertical: 6, paddingHorizontal: 10},
  btnTxt: {fontSize: 16, fontWeight: '700', textAlign: 'center'},
  btnSub: {fontSize: 11, marginTop: 2, textAlign: 'center'},
  avatarFallback: {
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
  empty: {color: C.muted, textAlign: 'center', marginVertical: 24, fontSize: 15},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: R,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: {fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: C.text,
    backgroundColor: '#fff',
  },
  chip: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipTxt: {fontWeight: '700', fontSize: 14},
  sheetWrap: {flex: 1, backgroundColor: '#00000066'},
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sheetTitle: {fontSize: 19, fontWeight: '800', color: C.text, flex: 1},
  sheetClose: {fontSize: 20, color: C.muted, paddingLeft: 12},
  sheetFooter: {paddingHorizontal: 16, paddingTop: 8, gap: 8},
  name: {fontSize: 16, fontWeight: '600', color: C.text, flex: 1},
  muted: {color: C.muted, fontSize: 13},
});
