import { ChannelType, ConnectionHandler, UserEventHandler } from '@sendbird/chat';
import type { GroupChannelHandler, GroupChannelListQueryParams } from '@sendbird/chat/groupChannel';
import type {
  ConnectionHandlerParams,
  GroupChannelHandlerParams,
  OpenChannelHandlerParams,
  UserEventHandlerParams,
} from '@sendbird/chat/lib/__definition';
import type { OpenChannelHandler, OpenChannelListQueryParams } from '@sendbird/chat/openChannel';
import type { SendbirdChatSDK, SendbirdGroupChannel, SendbirdOpenChannel } from '@sendbird/uikit-utils';

import { createFixtureContext } from '../__fixtures__/createFixtureContext';
import { createMockChannel } from './createMockChannel';
import { createMockQuery } from './createMockQuery';
import { createMockUser } from './createMockUser';

const fixture = createFixtureContext();

export interface MockSendbirdChatSDK extends SendbirdChatSDK {
  __emit(
    type: 'channel' | 'connection' | 'userEvent',
    name:
      | `group_${keyof GroupChannelHandlerParams}`
      | `open_${keyof OpenChannelHandlerParams}`
      | keyof ConnectionHandlerParams
      | keyof UserEventHandlerParams,
    ...args: unknown[]
  ): void;
  __context: {
    openChannels: SendbirdOpenChannel[];
    groupChannels: SendbirdGroupChannel[];
    groupChannelHandlers: Record<string, GroupChannelHandler>;
    openChannelHandlers: Record<string, OpenChannelHandler>;
    connectionHandlers: Record<string, ConnectionHandler>;
    userEventHandlers: Record<string, UserEventHandler>;
  };
  __configs: MockSDKConfigs;
  __throwIfFailureTest(): void;
}

type MockSDKConfigs = { testType: 'success' | 'failure'; userId?: string };

const defaultConfigs: MockSDKConfigs = { testType: 'success', userId: 'user_id_' + fixture.getHash() };

export const createMockSendbird = (configs: MockSDKConfigs = defaultConfigs): MockSendbirdChatSDK => {
  return new MockSDK(configs).asMockSendbirdChatSDK();
};

// @ts-ignore

class MockSDK implements MockSendbirdChatSDK {
  __configs = defaultConfigs;
  __context = {
    groupChannels: [] as SendbirdGroupChannel[],
    openChannels: [] as SendbirdOpenChannel[],
    groupChannelHandlers: {} as Record<string, GroupChannelHandler>,
    openChannelHandlers: {} as Record<string, OpenChannelHandler>,
    connectionHandlers: {} as Record<string, ConnectionHandler>,
    userEventHandlers: {} as Record<string, UserEventHandler>,
  };

  __emit(...[name, type, ...args]: Parameters<MockSendbirdChatSDK['__emit']>) {
    switch (name) {
      case 'channel': {
        if (type.startsWith('open_')) {
          const eventName = type.replace('open_', '') as keyof OpenChannelHandlerParams;
          Object.values(this.__context.openChannelHandlers).forEach((handler) => {
            // @ts-ignore
            handler[eventName]?.(...args);
          });
        }
        if (type.startsWith('group_')) {
          const eventName = type.replace('group_', '') as keyof GroupChannelHandlerParams;
          Object.values(this.__context.groupChannelHandlers).forEach((handler) => {
            // @ts-ignore
            handler[eventName]?.(...args);
          });
        }
        break;
      }
      case 'connection': {
        const eventName = type as keyof ConnectionHandlerParams;
        Object.values(this.__context.connectionHandlers).forEach((handler) => {
          // @ts-ignore
          handler[eventName]?.(...args);
        });
        break;
      }
      case 'userEvent': {
        const eventName = type as keyof UserEventHandlerParams;
        Object.values(this.__context.userEventHandlers).forEach((handler) => {
          // @ts-ignore
          handler[eventName]?.(...args);
        });
        break;
      }
    }
  }
  __throwIfFailureTest() {
    if (this.__configs.testType === 'failure') throw new Error('Failure test');
  }

  currentUser = createMockUser(this.__configs);
  addConnectionHandler = jest.fn((id: string, handler: ConnectionHandler) => {
    this.__context.connectionHandlers[id] = handler;
  });
  removeConnectionHandler = jest.fn((id: string) => {
    delete this.__context.connectionHandlers[id];
  });
  addUserEventHandler = jest.fn((id: string, handler: UserEventHandler) => {
    this.__context.userEventHandlers[id] = handler;
  });
  removeUserEventHandler = jest.fn((id: string) => {
    delete this.__context.userEventHandlers[id];
  });

  connect = jest.fn(async () => {
    this.__throwIfFailureTest();
    this.__emit('connection', 'onReconnectStarted');
    this.__emit('connection', 'onReconnectSucceeded');
    return this.currentUser;
  });

  groupChannel = {
    getChannel: jest.fn(async (url: string) => {
      this.__throwIfFailureTest();

      const channelInContext = this.__context.groupChannels.find((it) => it.url === url);
      if (channelInContext) {
        return channelInContext;
      } else {
        const channel = createMockChannel({
          channelType: ChannelType.GROUP,
          url,
          sdk: this.asMockSendbirdChatSDK(),
        }).asGroupChannel();
        this.__context.groupChannels.push(channel);
        return channel;
      }
    }),
    addGroupChannelHandler: jest.fn((id: string, handler: GroupChannelHandler) => {
      this.__context.groupChannelHandlers[id] = handler;
    }),
    removeGroupChannelHandler: jest.fn((id: string) => {
      delete this.__context.groupChannelHandlers[id];
    }),
    createGroupChannelListQuery: jest.fn((params?: GroupChannelListQueryParams) => {
      return createMockQuery({ type: 'groupChannel', limit: params?.limit, dataLength: 200 });
    }),
  } as unknown as SendbirdChatSDK['groupChannel'];

  openChannel = {
    getChannel: jest.fn(async (url: string) => {
      this.__throwIfFailureTest();

      const channelInContext = this.__context.openChannels.find((it) => it.url === url);
      if (channelInContext) {
        return channelInContext;
      } else {
        const channel = createMockChannel({
          channelType: ChannelType.OPEN,
          url,
          sdk: this.asMockSendbirdChatSDK(),
        }).asOpenChannel();
        this.__context.openChannels.push(channel);
        return channel;
      }
    }),
    addOpenChannelHandler: jest.fn((id: string, handler: OpenChannelHandler) => {
      this.__context.openChannelHandlers[id] = handler;
    }),
    removeOpenChannelHandler: jest.fn((id: string) => {
      delete this.__context.openChannelHandlers[id];
    }),
    createOpenChannelListQuery: jest.fn((params?: OpenChannelListQueryParams) => {
      return createMockQuery({ type: 'openChannel', limit: params?.limit, dataLength: 200 });
    }),
  } as unknown as SendbirdChatSDK['openChannel'];
  constructor(configs: MockSDKConfigs = defaultConfigs) {
    this.__configs = { ...defaultConfigs, ...configs };
  }
  asMockSendbirdChatSDK() {
    return this as unknown as MockSendbirdChatSDK;
  }
}
