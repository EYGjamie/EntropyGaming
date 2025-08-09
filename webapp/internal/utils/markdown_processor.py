# webapp/internal/utils/markdown_processor.py
"""
Enhanced Markdown processor with full feature support
"""

import markdown
from markdown.extensions import codehilite, fenced_code, tables, toc, nl2br, sane_lists
from markdown.extensions.footnotes import FootnoteExtension
from markdown.extensions.attr_list import AttrListExtension
from markdown.extensions.def_list import DefListExtension
from markdown.extensions.admonition import AdmonitionExtension
from markupsafe import Markup
import re


class StrikethroughExtension(markdown.Extension):
    """Extension for strikethrough text ~~text~~"""
    
    def extendMarkdown(self, md):
        processor = StrikethroughProcessor(md)
        processor.priority = 55  # Higher than emphasis
        md.inlinePatterns.register(processor, 'strikethrough', 55)


class StrikethroughProcessor(markdown.inlinepatterns.Pattern):
    """Processor for strikethrough pattern"""
    
    def __init__(self, md):
        super().__init__(r'~~(.+?)~~', md)
    
    def handleMatch(self, m):
        el = markdown.util.etree.Element('del')
        el.text = m.group(2)
        return el


class TaskListExtension(markdown.Extension):
    """Extension for task lists [ ] and [x]"""
    
    def extendMarkdown(self, md):
        processor = TaskListProcessor(md)
        processor.priority = 50
        md.preprocessors.register(processor, 'tasklist', 50)


class TaskListProcessor(markdown.preprocessors.Preprocessor):
    """Processor for task list items"""
    
    def run(self, lines):
        new_lines = []
        for line in lines:
            # Match task list items
            task_pattern = re.match(r'^(\s*[-*+])\s+\[([ xX])\]\s+(.+)$', line)
            if task_pattern:
                indent, checkbox, text = task_pattern.groups()
                checked = 'checked' if checkbox.lower() == 'x' else ''
                new_line = f'{indent} <input type="checkbox" disabled {checked}> {text}'
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        return new_lines


class MermaidExtension(markdown.Extension):
    """Extension for Mermaid diagrams"""
    
    def extendMarkdown(self, md):
        processor = MermaidProcessor(md)
        processor.priority = 105  # Before code blocks
        md.preprocessors.register(processor, 'mermaid', 105)


class MermaidProcessor(markdown.preprocessors.Preprocessor):
    """Processor for Mermaid diagram blocks"""
    
    def run(self, lines):
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            if line.strip() == '```mermaid':
                # Start of mermaid block
                mermaid_lines = []
                i += 1
                while i < len(lines) and lines[i].strip() != '```':
                    mermaid_lines.append(lines[i])
                    i += 1
                
                # Create mermaid div
                mermaid_content = '\n'.join(mermaid_lines)
                mermaid_html = f'<div class="mermaid">\n{mermaid_content}\n</div>'
                new_lines.append(mermaid_html)
            else:
                new_lines.append(line)
            i += 1
        return new_lines


def get_markdown_instance():
    """Get configured markdown instance with all extensions"""
    
    extensions = [
        # Core extensions
        'markdown.extensions.extra',  # Includes tables, footnotes, attr_list, def_list, etc.
        'markdown.extensions.codehilite',
        'markdown.extensions.fenced_code',
        'markdown.extensions.toc',
        'markdown.extensions.nl2br',
        'markdown.extensions.sane_lists',
        'markdown.extensions.smarty',
        'markdown.extensions.admonition',
        
        # Custom extensions
        StrikethroughExtension(),
        TaskListExtension(),
        MermaidExtension(),
    ]
    
    extension_configs = {
        'markdown.extensions.codehilite': {
            'css_class': 'highlight',
            'use_pygments': True,
            'guess_lang': True,
            'linenums': False,
        },
        'markdown.extensions.toc': {
            'permalink': True,
            'permalink_text': '🔗',
            'baselevel': 1,
            'toc_depth': 6,
        },
        'markdown.extensions.footnotes': {
            'PLACE_MARKER': '///Footnotes Go Here///',
            'UNIQUE_IDS': True,
        },
        'markdown.extensions.smarty': {
            'smart_angled_quotes': True,
            'smart_dashes': True,
            'smart_ellipses': True,
            'smart_quotes': True,
        }
    }
    
    return markdown.Markdown(
        extensions=extensions,
        extension_configs=extension_configs,
        output_format='html5',
        tab_length=2
    )


def markdown_to_html(content):
    """Convert markdown content to HTML"""
    if not content:
        return ''
    
    md = get_markdown_instance()
    html = md.convert(str(content))
    return Markup(html)


def markdown_to_html_with_math(content):
    """Convert markdown content to HTML with math support"""
    if not content:
        return ''
    
    # Pre-process for mathematical expressions
    # Protect math expressions from markdown processing
    math_blocks = []
    
    # Extract display math blocks $$...$$
    def protect_display_math(match):
        math_blocks.append(('display', match.group(1)))
        return f'__MATH_DISPLAY_{len(math_blocks)-1}__'
    
    content = re.sub(r'\$\$(.*?)\$\$', protect_display_math, content, flags=re.DOTALL)
    
    # Extract inline math $...$
    def protect_inline_math(match):
        math_blocks.append(('inline', match.group(1)))
        return f'__MATH_INLINE_{len(math_blocks)-1}__'
    
    content = re.sub(r'\$([^$\n]+?)\$', protect_inline_math, content)
    
    # Process markdown
    md = get_markdown_instance()
    html = md.convert(str(content))
    
    # Restore math expressions
    for i, (math_type, math_content) in enumerate(math_blocks):
        if math_type == 'display':
            placeholder = f'__MATH_DISPLAY_{i}__'
            math_html = f'<div class="math-display">\\[{math_content}\\]</div>'
        else:
            placeholder = f'__MATH_INLINE_{i}__'
            math_html = f'<span class="math-inline">\\({math_content}\\)</span>'
        
        html = html.replace(placeholder, math_html)
    
    return Markup(html)


# Export functions for use in other modules
__all__ = ['markdown_to_html', 'markdown_to_html_with_math', 'get_markdown_instance']