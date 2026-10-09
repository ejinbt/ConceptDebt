from app import checker


def test_expression_equivalence():
    assert checker.check("expression", "3x + 6", "6 + 3x")
    assert checker.check("expression", "3x + 6", "3*x+6")
    assert not checker.check("expression", "3x + 6", "3x + 2")
    assert checker.check("expression", "x^2 + 6x + 9", "x² + 6x + 9")


def test_numbers():
    assert checker.check("number", "5/6", "5/6")
    assert checker.check("number", "5/6", "0.8333")
    assert checker.check("number", "7", "x = 7")
    assert not checker.check("number", "7", "17")
    assert checker.check("number", "14", "14")


def test_factored_requires_a_product():
    assert checker.check("factored", "3(2x + 3)", "3(2x+3)")
    assert not checker.check("factored", "3(2x + 3)", "6x + 9")


def test_distractor_match():
    ds = [{"answer": "3x + 2", "misconception_id": "partial_distribution"}]
    assert checker.match_distractor("expression", ds, "2 + 3x") == "partial_distribution"
    assert checker.match_distractor("expression", ds, "3x + 7") is None


def test_garbage_is_safe():
    assert not checker.check("expression", "3x + 6", "import os")
    assert not checker.check("number", "5", "")
