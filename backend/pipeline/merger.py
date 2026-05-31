def merge(whisper_segments: list[dict], diarization_segments: list[dict]) -> list[dict]:
    result = []

    for ws in whisper_segments:
        w_start, w_end = ws["start"], ws["end"]
        best_speaker = "UNKNOWN"
        best_overlap = 0.0

        for ds in diarization_segments:
            overlap = max(0.0, min(w_end, ds["end"]) - max(w_start, ds["start"]))
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = ds["speaker"]

        result.append({
            "speaker": best_speaker,
            "start_time": w_start,
            "end_time": w_end,
            "text": ws["text"],
        })

    return result
