from app.utils import chunk_text, percentile, recall_at_k, reciprocal_rank, rrf


def test_rrf_prefers_items_ranked_high_in_both_lists():
    assert rrf([[1, 2, 3], [3, 1, 4]])[:2] == [1, 3]


def test_rrf_includes_items_from_either_list():
    assert set(rrf([[1], [2]])) == {1, 2}


def test_chunk_text_respects_size_and_overlaps():
    text = "\n\n".join(f"Paragraph {i} " + "x" * 200 for i in range(10))
    chunks = chunk_text(text, size=500, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) < 800 for c in chunks)


def test_metrics():
    assert recall_at_k(["a", "b"], ["b"], 5) == 1.0
    assert recall_at_k(["a", "b"], ["z"], 5) == 0.0
    assert reciprocal_rank(["a", "b", "c"], ["c"]) == 1 / 3
    assert reciprocal_rank(["a"], ["z"]) == 0.0


def test_percentile():
    assert percentile([1, 2, 3, 4, 5], 0.5) == 3
    assert percentile([], 0.95) == 0.0
