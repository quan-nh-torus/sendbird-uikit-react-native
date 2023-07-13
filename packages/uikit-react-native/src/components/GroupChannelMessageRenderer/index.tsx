import React from 'react';

import type { GroupChannelMessageProps, RegexTextPattern } from '@sendbird/uikit-react-native-foundation';
import {
  Box,
  GroupChannelMessage,
  Icon,
  Image,
  PressBox,
  Text,
  useUIKitTheme,
} from '@sendbird/uikit-react-native-foundation';
import {
  SendbirdAdminMessage,
  SendbirdFileMessage,
  SendbirdMessage,
  SendbirdUserMessage,
  calcMessageGrouping,
  getMessageType,
  isMyMessage,
  shouldRenderReaction,
  useIIFE,
} from '@sendbird/uikit-utils';

import type { GroupChannelProps } from '../../domain/groupChannel/types';
import { useLocalization, usePlatformService, useSendbirdChat } from '../../hooks/useContext';
import SBUUtils from '../../libs/SBUUtils';
import { ReactionAddons } from '../ReactionAddons';
import GroupChannelMessageDateSeparator from './GroupChannelMessageDateSeparator';
import GroupChannelMessageFocusAnimation from './GroupChannelMessageFocusAnimation';
import GroupChannelMessageOutgoingStatus from './GroupChannelMessageOutgoingStatus';
import { View } from 'react-native';

const GroupChannelMessageRenderer: GroupChannelProps['Fragment']['renderMessage'] = ({
  channel,
  message,
  onPress,
  onLongPress,
  onPressParentMessage,
  onShowUserProfile,
  enableMessageGrouping,
  focused,
  prevMessage,
  nextMessage,
}) => {
  const { palette } = useUIKitTheme();
  const { sbOptions, currentUser, mentionManager } = useSendbirdChat();
  const { STRINGS } = useLocalization();
  const { mediaService } = usePlatformService();
  const { groupWithPrev, groupWithNext } = calcMessageGrouping(
    Boolean(enableMessageGrouping),
    message,
    prevMessage,
    nextMessage,
  );

  const reactionChildren = useIIFE(() => {
    if (
      shouldRenderReaction(channel, sbOptions.uikitWithAppInfo.groupChannel.channel.enableReactions) &&
      message.reactions &&
      message.reactions.length > 0
    ) {
      return <ReactionAddons.Message channel={channel} message={message} />;
    }
    return null;
  });

  const messageProps: Omit<GroupChannelMessageProps<SendbirdMessage>, 'message'> = {
    channel,
    variant: isMyMessage(message, currentUser?.userId) ? 'outgoing' : 'incoming',
    onPress,
    onLongPress,
    onPressURL: (url) => SBUUtils.openURL(url),
    onPressAvatar: () => {
      if ('sender' in message) onShowUserProfile?.(message.sender);
    },
    onPressMentionedUser: (mentionedUser) => {
      if (mentionedUser) onShowUserProfile?.(mentionedUser);
    },
    groupedWithPrev: groupWithPrev,
    groupedWithNext: groupWithNext,
    children: reactionChildren,
    sendingStatus: isMyMessage(message, currentUser?.userId) ? (
      <GroupChannelMessageOutgoingStatus channel={channel} message={message} />
    ) : null,
    strings: {
      edited: STRINGS.GROUP_CHANNEL.MESSAGE_BUBBLE_EDITED_POSTFIX,
      senderName: ('sender' in message && message.sender.nickname) || STRINGS.LABELS.USER_NO_NAME,
      sentDate: STRINGS.GROUP_CHANNEL.MESSAGE_BUBBLE_TIME(message),
      fileName: message.isFileMessage() ? STRINGS.GROUP_CHANNEL.MESSAGE_BUBBLE_FILE_TITLE(message) : '',
      unknownTitle: STRINGS.GROUP_CHANNEL.MESSAGE_BUBBLE_UNKNOWN_TITLE(message),
      unknownDescription: STRINGS.GROUP_CHANNEL.MESSAGE_BUBBLE_UNKNOWN_DESC(message),
    },
  };

  const userMessageProps: {
    renderRegexTextChildren: (message: SendbirdUserMessage) => string;
    regexTextPatterns: RegexTextPattern[];
  } = {
    renderRegexTextChildren: (message) => {
      if (
        mentionManager.shouldUseMentionedMessageTemplate(message, sbOptions.uikit.groupChannel.channel.enableMention)
      ) {
        return message.mentionedMessageTemplate;
      } else {
        return message.message;
      }
    },
    regexTextPatterns: [
      {
        regex: mentionManager.templateRegex,
        replacer({ match, groups, parentProps, index, keyPrefix }) {
          const user = message.mentionedUsers?.find((it) => it.userId === groups[2]);
          if (user) {
            const mentionColor =
              !isMyMessage(message, currentUser?.userId) && user.userId === currentUser?.userId
                ? palette.onBackgroundLight01
                : parentProps?.color;

            return (
              <Text
                {...parentProps}
                key={`${keyPrefix}-${index}`}
                color={mentionColor}
                onPress={() => messageProps.onPressMentionedUser?.(user)}
                onLongPress={messageProps.onLongPress}
                style={[
                  parentProps?.style,
                  { fontWeight: '700' },
                  user.userId === currentUser?.userId && { backgroundColor: palette.highlight },
                ]}
              >
                {`${mentionManager.asMentionedMessageText(user)}`}
              </Text>
            );
          }
          return match;
        },
      },
    ],
  };

  const renderMessage = () => {
    switch (getMessageType(message)) {
      case 'admin': {
        return <GroupChannelMessage.Admin message={message as SendbirdAdminMessage} {...messageProps} />;
      }
      case 'user':
      case 'user.opengraph': {
        if (message.ogMetaData && sbOptions.uikitWithAppInfo.groupChannel.channel.enableOgtag) {
          return (
            <GroupChannelMessage.OpenGraphUser
              message={message as SendbirdUserMessage}
              {...userMessageProps}
              {...messageProps}
            />
          );
        } else {
          return (
            <GroupChannelMessage.User
              message={message as SendbirdUserMessage}
              {...userMessageProps}
              {...messageProps}
            />
          );
        }
      }
      case 'file':
      case 'file.audio': {
        return <GroupChannelMessage.File message={message as SendbirdFileMessage} {...messageProps} />;
      }
      case 'file.image': {
        return <GroupChannelMessage.ImageFile message={message as SendbirdFileMessage} {...messageProps} />;
      }
      case 'file.video': {
        return (
          <GroupChannelMessage.VideoFile
            message={message as SendbirdFileMessage}
            fetchThumbnailFromVideoSource={(uri) => mediaService.getVideoThumbnail({ url: uri, timeMills: 1000 })}
            {...messageProps}
          />
        );
      }
      case 'unknown':
      default: {
        return <GroupChannelMessage.Unknown message={message} {...messageProps} />;
      }
    }
  };

  const messageGap = useIIFE(() => {
    if (message.isAdminMessage()) {
      if (nextMessage?.isAdminMessage()) {
        return 8;
      } else {
        return 16;
      }
    } else if (groupWithNext) {
      return 2;
    } else {
      return 16;
    }
  });

  return (
    <Box paddingHorizontal={16} marginBottom={messageGap}>
      <GroupChannelMessageDateSeparator message={message} prevMessage={prevMessage} />
      {
        message.parentMessage &&
        (message.isUserMessage() || message.isFileMessage()) &&
        (message.parentMessage.isUserMessage() || message.parentMessage.isFileMessage()) &&
        <ParentMessage message={message.parentMessage} childMessage={message} onPress={onPressParentMessage} />
      }
      <GroupChannelMessageFocusAnimation focused={focused}>{renderMessage()}</GroupChannelMessageFocusAnimation>
    </Box>
  );
};

const ParentMessage = (props: {
  message: SendbirdUserMessage | SendbirdFileMessage;
  childMessage: SendbirdUserMessage | SendbirdFileMessage;
  onPress?: (message: SendbirdMessage) => void;
}) => {
  const { message, childMessage, onPress } = props;
  const { currentUser } = useSendbirdChat();
  const { STRINGS } = useLocalization();
  const type = getMessageType(message);

  let parentMessageComponent = null;
  switch (type) {
    case 'user':
    case 'user.opengraph': {
      parentMessageComponent = (
        <Text>{(message as SendbirdUserMessage).message}</Text>
      );
      break;
    }

    case 'file':
    case 'file.video':
    case 'file.audio': {
      parentMessageComponent = (
        <Text>{`File: ${(message as SendbirdFileMessage).name}`}</Text>
      );
      break;
    }

    case 'file.image': {
      parentMessageComponent = (
        <Image
          style={{ opacity: 0.5, width: 180, height: 80 }}
          source={{ uri: (message as SendbirdFileMessage).url }}
        />
      );
      break;
    }
  }
  return <View>
    <View style={{
      flex: 1,
      flexDirection: 'row',
      justifyContent: isMyMessage(childMessage, currentUser?.userId) ? 'flex-end' : 'flex-start',
    }}>
      <Icon
        icon={'reply-filled'}
        size={13}
        containerStyle={{ marginRight: 4 }}
      />
      <Text style={{ color: '#999', fontSize: 13, fontWeight: '800' }}>{STRINGS.LABELS.REPLY_FROM_SENDER_TO_RECEIVER(childMessage.sender, message.sender)}</Text>
    </View>
    <PressBox style={{
      flexDirection: 'row',
      justifyContent: isMyMessage(childMessage, currentUser?.userId) ? 'flex-end' : 'flex-start',
    }} onPress={() => onPress?.(props.message)}>
      {parentMessageComponent}
    </PressBox>
  </View>
};

export default React.memo(GroupChannelMessageRenderer);
