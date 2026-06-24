from pipeline.merger import merge


class TestMerge:
    def test_empty_whisper_segments_returns_empty_list(self):
        assert merge([], [{"start": 0, "end": 5, "speaker": "A"}]) == []

    def test_empty_diarization_segments_defaults_to_unknown(self):
        whisper = [{"start": 0.0, "end": 5.0, "text": "hello"}]
        result = merge(whisper, [])
        assert result == [
            {"speaker": "UNKNOWN", "start_time": 0.0, "end_time": 5.0, "text": "hello"}
        ]

    def test_both_empty_returns_empty_list(self):
        assert merge([], []) == []

    def test_no_overlap_defaults_to_unknown(self):
        whisper = [{"start": 0.0, "end": 1.0, "text": "hi"}]
        diarization = [{"start": 10.0, "end": 11.0, "speaker": "A"}]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "UNKNOWN"

    def test_single_clear_overlap_picks_that_speaker(self):
        whisper = [{"start": 0.0, "end": 5.0, "text": "hello"}]
        diarization = [{"start": 0.0, "end": 5.0, "speaker": "A"}]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "A"

    def test_picks_speaker_with_largest_overlap(self):
        whisper = [{"start": 0.0, "end": 10.0, "text": "hello"}]
        diarization = [
            {"start": 0.0, "end": 2.0, "speaker": "A"},  # 2s overlap
            {"start": 2.0, "end": 9.0, "speaker": "B"},  # 7s overlap
            {"start": 9.0, "end": 10.0, "speaker": "C"},  # 1s overlap
        ]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "B"

    def test_exact_tie_keeps_first_seen_speaker(self):
        # Strictly-greater comparison means a later equal overlap does not replace the first.
        whisper = [{"start": 0.0, "end": 4.0, "text": "hello"}]
        diarization = [
            {"start": 0.0, "end": 2.0, "speaker": "A"},  # 2s overlap
            {"start": 2.0, "end": 4.0, "speaker": "B"},  # 2s overlap, tie
        ]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "A"

    def test_zero_duration_whisper_segment_has_zero_overlap_and_is_unknown(self):
        whisper = [{"start": 5.0, "end": 5.0, "text": "..."}]
        diarization = [{"start": 0.0, "end": 10.0, "speaker": "A"}]
        result = merge(whisper, diarization)
        # overlap is 0.0, which is not > best_overlap (0.0), so it stays UNKNOWN
        assert result[0]["speaker"] == "UNKNOWN"

    def test_multiple_whisper_segments_each_matched_independently(self):
        whisper = [
            {"start": 0.0, "end": 2.0, "text": "first"},
            {"start": 2.0, "end": 4.0, "text": "second"},
        ]
        diarization = [
            {"start": 0.0, "end": 2.0, "speaker": "A"},
            {"start": 2.0, "end": 4.0, "speaker": "B"},
        ]
        result = merge(whisper, diarization)
        assert [seg["speaker"] for seg in result] == ["A", "B"]

    def test_output_field_names_and_text_passthrough(self):
        whisper = [{"start": 1.5, "end": 2.5, "text": "  spaced text  "}]
        result = merge(whisper, [])
        assert set(result[0].keys()) == {"speaker", "start_time", "end_time", "text"}
        assert result[0]["start_time"] == 1.5
        assert result[0]["end_time"] == 2.5
        # merge() does not trim text itself -- that's transcriber's job.
        assert result[0]["text"] == "  spaced text  "

    def test_partial_overlap_at_boundary_counts(self):
        whisper = [{"start": 0.0, "end": 5.0, "text": "hello"}]
        diarization = [{"start": 4.0, "end": 6.0, "speaker": "A"}]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "A"

    def test_touching_boundary_has_zero_overlap(self):
        whisper = [{"start": 0.0, "end": 5.0, "text": "hello"}]
        diarization = [{"start": 5.0, "end": 6.0, "speaker": "A"}]
        result = merge(whisper, diarization)
        assert result[0]["speaker"] == "UNKNOWN"

    def test_preserves_whisper_segment_order(self):
        whisper = [
            {"start": 0.0, "end": 1.0, "text": "third"},
            {"start": 1.0, "end": 2.0, "text": "first"},
            {"start": 2.0, "end": 3.0, "text": "second"},
        ]
        result = merge(whisper, [])
        assert [seg["text"] for seg in result] == ["third", "first", "second"]
