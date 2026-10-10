"""Deterministic answer checking with sympy, so "6 + 3x" matches "3x + 6"."""

import re
from typing import Optional

import sympy
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

_TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
_SYMBOLS = {name: sympy.Symbol(name) for name in "abcmnpqrstuvwxyz"}
_SYMBOLS.update(sqrt=sympy.sqrt, pi=sympy.pi)

_REPLACEMENTS = {"×": "*", "·": "*", "÷": "/", "−": "-", "–": "-", "²": "^2", "³": "^3"}


def _normalise(text: str) -> str:
    text = text.strip().lower()
    for old, new in _REPLACEMENTS.items():
        text = text.replace(old, new)
    # "√12" / "2√3" / "√(x+1)" -> sqrt(...); "20%" / "₹600" -> plain numbers
    text = re.sub(r"√\s*(\d+|[a-z])", r"sqrt(\1)", text).replace("√", "sqrt")
    text = text.replace("%", "").replace("₹", "")
    # "x = 5" -> "5": keep what follows the last equals sign
    if "=" in text:
        text = text.rsplit("=", 1)[1]
    return re.sub(r"\s+", " ", text).strip()


def parse(text: str, evaluate: bool = True) -> Optional[sympy.Expr]:
    text = _normalise(text or "")
    if not text or len(text) > 200:
        return None
    try:
        return parse_expr(text, local_dict=_SYMBOLS, transformations=_TRANSFORMS, evaluate=evaluate)
    except Exception:
        return None


def is_valid_answer(kind: str, given: str, expected: str, prompt: str = "") -> bool:
    """False for gibberish: input that isn't maths, or uses letters that have
    nothing to do with the question ("hello" parses as h*e*l*l*o)."""
    expr = parse(given)
    if expr is None:
        return False
    used = {str(s) for s in expr.free_symbols}
    if kind == "number":
        return not used
    allowed = {str(s) for s in (parse(expected) or sympy.Integer(0)).free_symbols}
    allowed |= set(re.findall(r"(?<![a-z])([a-z])(?![a-z])", prompt.lower()))
    allowed |= {"x"}
    return used <= allowed


def equivalent(a: str, b: str, kind: str = "expression") -> bool:
    ea, eb = parse(a), parse(b)
    if ea is None or eb is None:
        return False
    try:
        if kind == "number":
            if ea.free_symbols or eb.free_symbols:
                return False
            va, vb = complex(ea.evalf()), complex(eb.evalf())
            return abs(va - vb) <= 0.005 * max(1.0, abs(vb))
        return sympy.simplify(sympy.expand(ea - eb)) == 0
    except Exception:
        return False


def is_factored(text: str) -> bool:
    expr = parse(text, evaluate=False)
    if expr is None or not isinstance(expr, sympy.Mul):
        return False
    # every factor must be non-trivial: reject "1*(6x + 9)"
    return all(arg != 1 for arg in expr.args) and any(isinstance(arg, sympy.Add) for arg in expr.args)


def check(kind: str, expected: str, given: str) -> bool:
    if kind == "factored":
        return equivalent(given, expected) and is_factored(given)
    return equivalent(given, expected, kind)


def is_parseable(text: str) -> bool:
    return parse(text) is not None


def match_distractor(kind: str, distractors: list[dict], given: str) -> Optional[str]:
    """Return the misconception id of a known wrong answer, if the answer matches one."""
    compare_kind = "number" if kind == "number" else "expression"
    for d in distractors or []:
        if equivalent(given, d["answer"], compare_kind):
            return d["misconception_id"]
    return None
