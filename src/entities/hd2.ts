import * as discord from "discord.js";
import { CCBot, CCBotEntity } from "../ccbot";
import { diffArrays, formatEmptyString, getJSON } from "../utils";
import { WatcherEntity, WatcherEntityData } from "../watchers";
import {
  APIGalacticWarEffect,
  APIGameClient,
  APIStatus,
  ApiType,
  GameClientFeature,
  GameClientOnlineOverride,
  def_effect_types,
  def_effect_value_types,
} from "../data/hd2";

const COLOURS = {
  added: "#2DB610",
  changed: "#E0A313",
  removed: "#E01D13",
} as const;

const colourApiUrl = (hex: string): string => {
  return `https://colours.alyxia.dev/${
    hex.startsWith("#") ? hex.slice(1) : hex
  }`;
};

interface HD2TrackerEntityData extends WatcherEntityData {
  channelId: discord.Snowflake;
  baseUrl: string;
  apiType: ApiType;
  warId: string;
  colour: string;

  effects?: APIGalacticWarEffect[];
  gameClient: APIGameClient;
  storyBeatId32?: number;
}

class HD2TrackerEntity extends WatcherEntity {
  public channel: discord.TextBasedChannel;
  public baseUrl: string;
  public apiType: ApiType;
  public warId: string;
  public colour: string;
  public data: Pick<HD2TrackerEntityData, "effects" | "gameClient" | "storyBeatId32">;

  public constructor(
    c: CCBot,
    id: string,
    channel: discord.TextBasedChannel,
    data: HD2TrackerEntityData
  ) {
    super(c, `hd2-tracker-${id}`, data);

    this.channel = channel;
    this.baseUrl = data.baseUrl.endsWith("/")
      ? data.baseUrl.slice(0, -1)
      : data.baseUrl;
    this.apiType = data.apiType;
    this.warId = data.warId;
    this.colour = data.colour;

    this.data = {
      effects: data.effects ?? [],
      gameClient: data.gameClient ?? { featureConfiguration: [], onlineOverrideConfiguration: [] },
      storyBeatId32: data.storyBeatId32 ?? 0,
    };
  }

  public async watcherTick(): Promise<void> {
    const urls = this.apiUrls();
    for (const type of Object.keys(urls)) {
      let res = await getJSON(urls[type](this.warId), {
        "User-Agent":
          "Keeper Discord Bot (https://github.com/lexisother/ccbot-custom/blob/master/src/entities/hd2.ts)",
      });

      switch (type) {
        case "effects": {
          this.handleEffects(res as APIGalacticWarEffect[]);
          break;
        }
        case "status": {
          this.handleStatus(res as APIStatus);
          break;
        }
        case "gameClient": {
          const gameClient = res as APIGameClient;
          this.handleGameClientFeatureConfigs(gameClient.featureConfiguration);
          this.handleGameClientOnlineOverrides(gameClient.onlineOverrideConfiguration);
          break;
        }
      }
    }

    this.postponeDeathAndUpdate();
  }

  public toSaveData(): HD2TrackerEntityData {
    return Object.assign(super.toSaveData(), {
      refreshMs: this.refreshMs,
      channelId: this.channel.id,
      baseUrl: this.baseUrl,
      apiType: this.apiType,
      warId: this.warId,
      colour: this.colour,

      effects: this.data.effects,
      gameClient: this.data.gameClient,
      storyBeatId32: this.data.storyBeatId32,
    });
  }

  private handleEffects(fetchedEffects: APIGalacticWarEffect[]): void {
    const oldEffects = this.data.effects ?? [];
    if (oldEffects.length === 0) {
      this.data.effects = fetchedEffects;
      return;
    }

    const diff = diffArrays<APIGalacticWarEffect>(oldEffects, fetchedEffects);

    for (const addition of diff.additions) {
      const embed = this.constructEffectEmbed("added", addition);
      this.channel.send({ embeds: [embed] });
    }

    for (const removal of diff.removals) {
      const embed = this.constructEffectEmbed("removed", removal);
      this.channel.send({ embeds: [embed] });
    }

    for (const change of diff.changes) {
      const embed = this.constructEffectEmbed("changed", change.after);
      const changeEmbed = this.constructChangesEmbed(
        'Effect Changes',
        change.before,
        change.after
      );

      this.channel.send({ embeds: [embed, changeEmbed] });
    }

    this.data.effects = fetchedEffects;
  }

  private handleStatus(status: APIStatus): void {
    if (this.data.storyBeatId32 === status.storyBeatId32) return;

    this.channel.send({
      embeds: [
        new discord.EmbedBuilder()
          .setAuthor({
            name: `storyBeatId32 changed on ${this.apiType}`,
            iconURL: colourApiUrl(this.colour),
          })
          .setColor(COLOURS.changed)
          .setTitle(
            `\`${this.data.storyBeatId32}\` → \`${status.storyBeatId32}\``
          ),
      ],
    });

    this.data.storyBeatId32 = status.storyBeatId32;
  }

  private handleGameClientFeatureConfigs(data: APIGameClient['featureConfiguration']): void {
    const oldFeatureConfiguration = this.data.gameClient.featureConfiguration;
    if (oldFeatureConfiguration.length === 0) {
      this.data.gameClient.featureConfiguration = data;
      return;
    }

    const diff = diffArrays<GameClientFeature>(oldFeatureConfiguration, data, 'id32');

    for (const addition of diff.additions) {
      const embed = this.constructGenericObjectEmbed('GameClient feature', 'added', addition);
      this.channel.send({ embeds: [embed] });
    }
    for (const removal of diff.removals) {
      const embed = this.constructGenericObjectEmbed('GameClient feature', 'removed', removal);
      this.channel.send({ embeds: [embed] });
    }
    for (const change of diff.changes) {
      const embed = this.constructGenericObjectEmbed('GameClient feature', 'changed', change.after);
      const changeEmbed = this.constructChangesEmbed(
        'Feature Changes',
        change.before,
        change.after
      );

      this.channel.send({ embeds: [embed, changeEmbed] });
    }

    this.data.gameClient.featureConfiguration = data;
  }

  private handleGameClientOnlineOverrides(data: APIGameClient['onlineOverrideConfiguration']): void {
    const oldOnlineOverrides = this.data.gameClient.onlineOverrideConfiguration;
    if (oldOnlineOverrides.length === 0) {
      this.data.gameClient.onlineOverrideConfiguration = data;
      return;
    }

    const diff = diffArrays<GameClientOnlineOverride>(oldOnlineOverrides, data);

    for (const addition of diff.additions) {
      const embed = this.constructGenericObjectEmbed('GameClient override', 'added', addition);
      this.channel.send({ embeds: [embed] });
    }
    for (const removal of diff.removals) {
      const embed = this.constructGenericObjectEmbed('GameClient override', 'removed', removal);
      this.channel.send({ embeds: [embed] });
    }
    for (const change of diff.changes) {
      const embed = this.constructGenericObjectEmbed('GameClient override', 'changed', change.after);
      const changeEmbed = this.constructChangesEmbed(
        'Override Changes',
        change.before,
        change.after
      );
      this.channel.send({ embeds: [embed, changeEmbed] });
    }

    this.data.gameClient.onlineOverrideConfiguration = data;
  }

  private constructEffectEmbed(
    type: "added" | "changed" | "removed",
    effect: APIGalacticWarEffect
  ): discord.EmbedBuilder {
    const values = [];
    for (let i = 0; i < 2; i++) {
      const [type, value] = [effect.valueTypes[i], effect.values[i]];
      values.push(
        `Type \`${def_effect_value_types[type] ?? `UNK`}\` (${type}): ${value}`
      );
    }

    return new discord.EmbedBuilder()
      .setAuthor({
        name: `Galactic War Effect ${type} on ${this.apiType}`,
        iconURL: colourApiUrl(this.colour),
      })
      .setTitle(
        `${effect.id} \`${def_effect_types[effect.effectType] ?? "UNK"} ${
          effect.effectType
        }\``
      )
      .addFields([
        {
          name: "`nameHash`",
          value: `\`${effect.nameHash}\``,
          inline: true,
        },
        {
          name: "`gameplayEffectId32`",
          value: `\`${effect.gameplayEffectId32}\``,
          inline: true,
        },
        ...values.map((v, i) => ({
          name: `Value ${i + 1}`,
          value: v,
        })),
      ])
      .setColor(
        type === "added"
          ? COLOURS.added
          : type === "changed"
          ? COLOURS.changed
          : COLOURS.removed
      );
  }

  private constructGenericObjectEmbed<T extends object>(
    ffor: string,
    type: 'added' | 'changed' | 'removed',
    data: T
  ): discord.EmbedBuilder {
    const fields: discord.APIEmbedField[] = Object.entries(data)
      .map(([key, value]) => ({
        name: `\`${key}\``,
        value: `\`${formatEmptyString(value)}\``,
        inline: true
      }));

    return new discord.EmbedBuilder()
      .setAuthor({
        name: `${ffor} ${type} on ${this.apiType}`,
        iconURL: colourApiUrl(this.colour)
      })
      .addFields([
        ...fields
      ])
      .setColor(
        type === "added"
          ? COLOURS.added
          : type === "changed"
          ? COLOURS.changed
          : COLOURS.removed
      );
  }

  private constructChangesEmbed<T extends object & {[key: string]: unknown}>(title: string, before: T, after: T): discord.EmbedBuilder {
    const embed = new discord.EmbedBuilder()
      .setAuthor({ name: title })
      .setColor('#E0A313');

    for (const key of Object.keys(before)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        embed.addFields({
          name: key,
          value: `\`${formatEmptyString(before[key])}\` → \`${formatEmptyString(after[key])}\``,
          inline: true,
        })
      }
    }

    return embed;
  }

  private apiUrls(): Record<string, (warId: string) => string> {
    return {
      effects: () => `${this.baseUrl}/api/WarSeason/GalacticWarEffects`,
      status: (warId) => `${this.baseUrl}/api/WarSeason/${warId}/Status`,
      gameClient: () => `${this.baseUrl}/api/Configuration/GameClient`,
    };
  }
}

export default async function load(
  c: CCBot,
  data: HD2TrackerEntityData
): Promise<CCBotEntity> {
  const channel = c.channels.cache.get(data.channelId);
  if (!channel) throw new Error(`unable to find the channel ${data.channelId}`);
  if (!channel.isTextBased())
    throw new Error(`channel ${data.channelId} is not a text channel`);
  return new HD2TrackerEntity(
    c,
    `${data.apiType}-${data.channelId}`,
    channel,
    data
  );
}
