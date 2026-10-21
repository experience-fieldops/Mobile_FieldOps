import { Text, TextProps } from 'react-native';

export default function AppText({ style, ...props }: TextProps) {
  return (
    <Text {...props} style={[{ fontFamily: 'Inter_400Regular' }, style]} />
  );
}
