import os
import tempfile
from core.file_parser import parse_file


def test_parse_text_file():
    with tempfile.NamedTemporaryFile(
        mode="w+", delete=False, suffix=".txt"
    ) as temp_file:
        temp_file.write("Hello, World!")
        temp_path = temp_file.name

    try:
        content = parse_file(temp_path)
        assert content == "Hello, World!"
    finally:
        os.remove(temp_path)


def test_parse_missing_file():
    result = parse_file("nonexistent.txt")
    assert "File not found" in result
