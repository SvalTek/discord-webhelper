// Copyright (C) 2022 Theros [SvalTek|MisModding]
//
// This file is part of discord-webapi.
//
// discord-oauth2 is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// discord-oauth2 is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with discord-oauth2.  If not, see <http://www.gnu.org/licenses/>.

"use strict";
const OAuth = require("discord-oauth2");
const RequestHandler = require("discord-oauth2/lib/eris/rest/RequestHandler");
const endpoints = require("./discordEndpoints.js");


function loadEndpoints() {
	var endpoints = require("./discordEndpoints.js");
	for (let i = 0; i < Object.keys(endpoints).length; i++) {
		let k = Object.keys(endpoints)[i];
		eval(`global.${k} = endpoints['${k}']`);
	}
	console.log("Discord endpoints loaded.");
}
loadEndpoints();

/**
 * Make requests to discord's OAuth2 API
 * @extends requestHandler
*/
class Discord extends RequestHandler {
	/**
	 *
	 * @arg {Object} opts
	 * @arg {String?} opts.version The version of the Discord API to use. Defaults to v7.
	 * @arg {Number} [opts.requestTimeout=15000] A number of milliseconds before requests are considered timed out
	 * @arg {Number} [opts.latencyThreshold=30000] The average request latency at which the RequestHandler will start emitting latency errors
	 * @arg {Number} [opts.ratelimiterOffset=0] A number of milliseconds to offset the ratelimit timing calculations by
	 * @arg {String?} opts.clientId Your application's client id
	 * @arg {String?} opts.clientSecret Your application's client secret
	 * @arg {String?} opts.redirectUri Your URL redirect uri
	 * @arg {String?} opts.credentials Base64 encoding of the UTF-8 encoded credentials string of your application
	*/
	constructor(opts = {}) {
		super({
			version: opts.version || "v7",
			requestTimeout: opts.requestTimeout || 15000,
			latencyThreshold: opts.latencyThreshold || 30000,
			ratelimiterOffset: opts.ratelimiterOffset || 0,
		});

		this.client_id = opts.clientId;
		this.client_secret = opts.clientSecret;
		this.redirect_uri = opts.redirectUri;
	}

	_encode(obj) {
		let string = "";

		for (const [key, value] of Object.entries(obj)) {
			if (!value) continue;
			string += `&${encodeURIComponent(key)}=${encodeURIComponent(
				value,
			)}`;
		}

		return string.substring(1);
	}

	//
	// ────────────────────────────────────────────────────────────────────── I ──────────
	//   :::::: G E N E R A L   M E T H O D S : :  :   :    :     :        :          :
	// ────────────────────────────────────────────────────────────────────────────────
	//

	/**
	 *
	 * @arg {Object} opts
	 * @arg {String} opts.guildId The ID of the guild
	 * @arg {String} opts.userId The ID of the user
	 * @arg {String} opts.botToken The token of the bot used to authenticate
	 * @returns {Promise<Object | String>}
	*/
	getGuildMember(opts) {
		return this.request(
			"GET",
			GUILD_MEMBER(opts.guildId, opts.userId),
			{},
			{
				auth: {
					type: "Bot",
					creds: opts.botToken,
				},
				contentType: "application/json",
			},
		);
	}

	/**
	 *
	 * @arg { Object } opts
	 * @arg { String } opts.guildId The ID of the guild
	 * @arg { String } opts.userId The ID of the user
	 * @arg { String } opts.roleId The ID of the role
	 * @arg { String } opts.botToken The token of the bot used to authenticate
	 * @returns { Promise < Object | String >}
	*/
	getGuildMemberRole(opts) {
		return this.request(
			"GET",
			GUILD_MEMBER_ROLE(opts.guildId, opts.userId, opts.roleId),
			{},
			{
				auth: {
					type: "Bot",
					creds: opts.botToken,
				},
				contentType: "application/json",
			},
		);

		/**
		 * @arg {Object} opts
		 * @arg {String} opts.guildId The ID of the guild
		 * @arg {String} opts.userId The ID of the user
		 * @arg {String} opts.botToken The token of the bot used to authenticate
		 * @returns {Promise<Object | String>}
		*/

	}

	//
	// ────────────────────────────────────────────────────────────────────── II ──────────
	//   :::::: U T I L I T Y   M E T H O D S : :  :   :    :     :        :          :
	// ────────────────────────────────────────────────────────────────────────────────
	//

	/**
	 * @arg {Object} opts
	 * 	@arg {String} opts.botToken The token of the bot used to authenticate
	 * @returns {Promise<Object | String>}
	*/
	async _getGuild(opts) {
		return this.request(
			"GET",
			GUILD(opts.guildId),
			{},
			{
				auth: {
					type: "Bot",
					creds: opts.botToken,
				},
				contentType: "application/json",
			},
		);
	}

	GuildCacheTimeout = 10000;
	// Array of Guilds used to cache requests
	GuildCache = [];

	// Guild() helper method, implements basic caching of results,
	// manages, guild entries in the cache, by keeping an array with lastUpdated times
	// and a map of guilds, if the guild is in the cache, it will return the cached guild unless
	// our specified timout has passed, in which case it will return a new guild, and update the cache.
	async getGuild(opts) {
		const { guildId } = opts;
		// Check if the guild is in the cache
		if (this.GuildCache[guildId]) {
			// Check if the cached guild is still valid
			if (Date.now() - this.GuildCache[guildId].lastUpdated > this.GuildCacheTimeout) {
				// Return the cached guild
				return this.GuildCache[guildId].guild;
			}
		}

		// If the guild is not in the cache, or the cached guild is invalid, fetch it from discord
		const guild = await this._getGuild(opts);

		// Update the cache
		this.GuildCache[guildId] = {
			guild,
			lastUpdated: Date.now(),
		};

		// Return the new guild
		return guild;
	}

	/** Fetch All Guilds this bot is in
	 * @arg {Object} opts
	 * @arg {String} opts.botToken The token of the bot used to authenticate
	 * @returns {Promise<Object | String>}
	*/
	async getAllGuilds(opts) {
		const { botToken } = opts;
		const guilds = await this.request(
			"GET",
			USER_GUILDS('@me'),
			{},
			{
				auth: {
					type: "Bot",
					creds: botToken,
				},
				contentType: "application/json",
			},
		);

		// add the guilds to the cache
		for (const guild of guilds) {
			this.GuildCache[guild.id] = {
				guild,
				lastUpdated: Date.now(),
			};
		}

		return guilds;
	}

}

module.exports = {
	OAuth,
	Discord,
}
