"""
PDF Generator for EUNOIA One-Pager
Converts the HTML one-pager to PDF format
"""

try:
    from weasyprint import HTML
    import os
    
    def generate_pdf():
        html_file = 'eunoia.kz/one-pager.html'
        pdf_file = 'eunoia.kz/EUNOIA-OnePager.pdf'
        
        if not os.path.exists(html_file):
            print(f"Error: {html_file} not found!")
            return
        
        print(f"Generating PDF from {html_file}...")
        HTML(html_file).write_pdf(pdf_file)
        print(f"✓ PDF generated successfully: {pdf_file}")
    
    if __name__ == '__main__':
        generate_pdf()

except ImportError:
    print("=" * 60)
    print("WeasyPrint library not found!")
    print("=" * 60)
    print("\nTo install WeasyPrint, run:")
    print("  pip install weasyprint")
    print("\nAlternatively, you can:")
    print("1. Open one-pager.html in your browser")
    print("2. Press Ctrl+P (or Cmd+P on Mac)")
    print("3. Select 'Save as PDF' as the destination")
    print("4. Set margins to 'None' and enable 'Background graphics'")
    print("=" * 60)

