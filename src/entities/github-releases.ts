import * as discord from "discord.js";
import { gt, gte, SemVer, valid } from 'semver';
import { WatcherEntity, WatcherEntityData } from "../watchers";
import { CCBot, CCBotEntity } from "../ccbot";
import { getJSON } from "../utils";

const releasesApiUrl = (repo: string) => `https://api.github.com/repos/${repo}/releases/latest`;

interface GitHubReleaseData {
  id: number;
  tag_name: string;
  html_url: string;
}

interface GitHubReleasesEntityData extends WatcherEntityData {
  channelId: discord.Snowflake;
  repo: string; // <owner>/<name>
  lastVersion?: string;
}

class GitHubReleasesEntity extends WatcherEntity {
  public channel: discord.TextBasedChannel;
  public data: GitHubReleasesEntityData;

  public constructor(
    c: CCBot,
    id: string,
    channel: discord.TextBasedChannel,
    data: GitHubReleasesEntityData
  ) {
    super(c, `github-releases-${id}`, data);

    this.channel = channel;
    this.data = data;
  }

  public async watcherTick(): Promise<void> {
    const res = await getJSON<GitHubReleaseData>(releasesApiUrl(this.data.repo));
    if (this.data.lastVersion === res.tag_name) return;

    const newVer = new SemVer(res.tag_name);
    const lastVer = new SemVer(this.data.lastVersion ?? 'v0.0.0');
    if (!valid(newVer)) this.channel.send(`${this.data.repo} release ${res.tag_name} parses as invalid semver.`);

    if (gt(newVer, lastVer))
      this.channel.send(`${this.data.repo} new release published: [\`${newVer}\`](<${res.html_url}>)`);
    if (gt(lastVer, newVer))
      this.channel.send(`Somehow, ${this.data.repo}'s version has decreased from ${lastVer} to [\`${newVer}\`](<${res.html_url}>)`);

    this.data.lastVersion = res.tag_name;
    this.postponeDeathAndUpdate();
  }

  public toSaveData(): GitHubReleasesEntityData {
    return Object.assign(super.toSaveData(), {
      channelId: this.channel.id,
      repo: this.data.repo,
      lastVersion: this.data.lastVersion,
    });
  }
}

export default async function load(
  c: CCBot,
  data: GitHubReleasesEntityData
): Promise<CCBotEntity> {
  const channel = c.channels.cache.get(data.channelId);
  if (!channel) throw new Error(`unable to find the channel ${data.channelId}`);
  if (!channel.isTextBased())
    throw new Error(`channel ${data.channelId} is not a text channel`);

  return new GitHubReleasesEntity(
    c,
    data.repo,
    channel,
    data
  )
}