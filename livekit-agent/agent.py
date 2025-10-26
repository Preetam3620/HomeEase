import json
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    UserInputTranscribedEvent
)
from livekit.plugins import deepgram
from dotenv import load_dotenv

load_dotenv(".env.local")


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    agent = Agent(
        instructions="You are a friendly voice assistant built by LiveKit.",
    )
    session = AgentSession(
        # vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
    )

    # Listen for transcription events
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: UserInputTranscribedEvent):
        if event.is_final:  # Only print final transcripts (not interim)
            print(f"[Transcript] {event.transcript}")
            print(f"  Language: {event.language}")
            if event.speaker_id:
                print(f"  Speaker: {event.speaker_id}")
            ctx.room.local_participant.publish_data(
                payload=json.dumps({
                    "type": "transcript",
                    "text": event.transcript,
                    "language": event.language
                }).encode(),
                reliable=True
            )

    await session.start(agent=agent, room=ctx.room)
    # await session.generate_reply(instructions="greet the user and ask about their day")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
