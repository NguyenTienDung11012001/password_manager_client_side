// src/services/gistService.js

const GIST_API_URL = 'https://api.github.com/gists/';

/**
 * A service class to interact with the GitHub Gist API.
 */
export class GistService {
  #gistId;
  #githubToken;

  /**
   * @param {string} gistId - The ID of the GitHub Gist.
   * @param {string} githubToken - The GitHub Personal Access Token.
   */
  constructor(gistId, githubToken) {
    if (!gistId || !githubToken) {
      throw new Error('Gist ID and GitHub Token are required.');
    }
    this.#gistId = gistId;
    this.#githubToken = githubToken;
  }

  /**
   * Fetches the encrypted payload for a specific user from the GitHub Gist.
   * @param {string} username - The user identifier.
   * @returns {Promise<string|null>} - The base64 encrypted payload, or null if not found.
   */
  async fetchUserData(username) {
    const fileName = `${username}.json`;
    try {
      const response = await fetch(`${GIST_API_URL}${this.#gistId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.#githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }

      const gist = await response.json();

      if (!gist.files || !gist.files[fileName]) {
        console.warn(`File "${fileName}" not found in Gist for user "${username}". It will be created on the first save.`);
        return null;
      }

      const fileContent = JSON.parse(gist.files[fileName].content);
      return fileContent.payload; // Return only the payload

    } catch (error) {
      console.error(`Failed to fetch data for user "${username}":`, error);
      throw new Error(`Could not fetch data for user "${username}". Check credentials and network.`);
    }
  }

  /**
   * Updates the Gist with a new encrypted payload for a specific user.
   * @param {string} username - The user identifier.
   * @param {string} encryptedPayload - The new base64 encrypted payload.
   * @returns {Promise<void>}
   */
  async updateUserData(username, encryptedPayload) {
    const fileName = `${username}.json`;
    const content = JSON.stringify({
      version: 1,
      owner: username,
      payload: encryptedPayload,
      updatedAt: Date.now(),
    });

    const body = {
      files: {
        [fileName]: {
          content: content,
        },
      },
    };

    try {
      const response = await fetch(`${GIST_API_URL}${this.#gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.#githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }

    } catch (error) {
      console.error(`Failed to update data for user "${username}":`, error);
      throw new Error(`Could not save data for user "${username}". Check credentials and network.`);
    }
  }
}
