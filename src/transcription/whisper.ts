import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { getConfig } from "../config.js";
import { getLogger } from "../logger.js";

const execAsync = promisify(exec);

const WHISPER_VENV =
  "/home/claude/projects/ccpa-telegram/.claude/whisper/venv/bin/python";
const WHISPER_SCRIPT =
  "/home/claude/projects/ccpa-telegram/.claude/whisper/transcribe.py";

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Transcribe audio file using local Python Whisper (CPU-only)
 */
export async function transcribeAudio(
  audioPath: string,
): Promise<TranscriptionResult> {
  const logger = getLogger();
  const config = getConfig();

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  // Map config model names (base.en) to Python whisper names (base)
  const configModel = config.transcription?.model || "base.en";
  const model = configModel.replace(/\.en$/, "");

  logger.debug({ audioPath, model }, "Starting transcription");

  const startTime = Date.now();

  try {
    const { stdout } = await execAsync(
      `"${WHISPER_VENV}" "${WHISPER_SCRIPT}" "${audioPath}" --model ${model} --json`,
      { timeout: 120000 },
    );

    const duration = (Date.now() - startTime) / 1000;
    const result = JSON.parse(stdout.trim());

    logger.debug(
      { duration: `${duration.toFixed(2)}s`, textLength: result.text.length },
      "Transcription complete",
    );

    return {
      text: result.text,
      language: result.language,
      duration,
    };
  } catch (error) {
    logger.error({ error, audioPath }, "Transcription failed");
    throw error;
  }
}
