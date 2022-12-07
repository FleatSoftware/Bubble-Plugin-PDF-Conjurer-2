function(properties, context) {
    const {
      prev_configs,
      show_page_number: showPageNumbers,
      start_count_on_second_page: startCountOnSecondPage,
      even_page_alignment,
      odd_page_alignment,
      use_exclude_pages,
      exclude_pages_counter,
      use_exclude_elements_pages,
      exclude_elements_pages,
      margin_left,
      margin_top,
      margin_right,
      margin_bottom,
      counter_style,
    } = properties;

    const configs = JSON.parse(prev_configs);

    configs.footerOptions = {
      showPageNumbers,
      evenPageAlignment: even_page_alignment.toLowerCase(),
      oddPageAlignment: odd_page_alignment.toLowerCase(),
      excludePagesCounter: [],
      excludePagesElements: [],
      startCountOnSecondPage,
      counterMargins: [margin_left, margin_top, margin_right, margin_bottom],
      elements: [],
      counterStyle: counter_style,
    };

    if (use_exclude_pages && exclude_pages_counter) {
      const exclude = [...exclude_pages_counter.matchAll(/\d+/g)].map((match) => Number(match[0]));
      configs.footerOptions.excludePagesCounter.push(...exclude);
    }
    
    if (startCountOnSecondPage) {
        configs.footerOptions.excludePagesCounter.push(0);
    }

    if (use_exclude_elements_pages && exclude_elements_pages) {
      const exclude = [...exclude_elements_pages.matchAll(/\d+/g)].map((match) => Number(match[0]));
      configs.footerOptions.excludePagesElements.push(...exclude);
    }

    const configurations = JSON.stringify(configs);

    return { configurations };    	
}